import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { sourceRevision, readArtifact, commitArtifact, withProductMutation } from './artifactFiles.js';

let sandbox: string;
let root: string;
const relativePath = 'products/PROD-1.yaml';
const original = '# original\nproduct:\n  id: PROD-1\n  name: Old\n';
const updated = original.replace('Old', 'New');
const file = () => path.join(root, relativePath);
const revision = () => sourceRevision(original);
const commit = (expectedRevision: string, transform = (_text: string) => updated) =>
  commitArtifact({ root, relativePath, expectedRevision, transform });

beforeEach(() => {
  sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-artifact-contract-'));
  root = path.join(sandbox, 'docs');
  fs.mkdirSync(path.join(root, 'products'), { recursive: true });
  fs.writeFileSync(file(), original, { mode: 0o640 });
});
afterEach(() => fs.rmSync(sandbox, { recursive: true, force: true }));

function expectUnchanged() {
  expect(fs.readFileSync(file(), 'utf8')).toBe(original);
  expect(fs.statSync(file()).mode & 0o777).toBe(0o640);
  expect(fs.readdirSync(path.dirname(file()))).toEqual(['PROD-1.yaml']);
}

describe('artifact filesystem revision contract', () => {
  it('uses a quoted SHA-256 hash of exact source bytes', () => {
    expect(sourceRevision(original)).toBe(`"${createHash('sha256').update(original).digest('hex')}"`);
    expect(sourceRevision(original + '\n')).not.toBe(sourceRevision(original));
  });

  it('reads source, revision and mode without modifying the file', () => {
    const result = readArtifact(root, relativePath);
    expect(result.text).toBe(original);
    expect(result.revision).toBe(revision());
    expect(result.mode & 0o777).toBe(0o640);
    expectUnchanged();
  });

  it('requires a revision and retains the original on rejection', async () => {
    await expect(commit('')).rejects.toMatchObject({ code: 'PRECONDITION_REQUIRED', status: 428 });
    expectUnchanged();
  });

  it('rejects a stale revision with a stable conflict code', async () => {
    await expect(commit(sourceRevision('stale'))).rejects.toMatchObject({ code: 'REVISION_CONFLICT', status: 409 });
    expectUnchanged();
  });

  it('hashes current bytes even if size and modification time have not changed', async () => {
    const stat = fs.statSync(file());
    const external = original.replace('Old', 'Ext');
    fs.writeFileSync(file(), external);
    fs.utimesSync(file(), stat.atime, stat.mtime);
    await expect(commit(revision())).rejects.toMatchObject({ code: 'REVISION_CONFLICT', status: 409 });
    expect(fs.readFileSync(file(), 'utf8')).toBe(external);
  });

  it('treats deletion since reading as a revision conflict', async () => {
    fs.unlinkSync(file());
    await expect(commit(revision())).rejects.toMatchObject({ code: 'REVISION_CONFLICT', status: 409 });
    expect(fs.existsSync(file())).toBe(false);
  });

  it('commits transformed source and preserves file mode', async () => {
    const result = await commit(revision(), (text) => {
      expect(text).toBe(original);
      return updated;
    });
    expect(result).toMatchObject({ text: updated, revision: sourceRevision(updated) });
    expect(fs.readFileSync(file(), 'utf8')).toBe(updated);
    expect(fs.statSync(file()).mode & 0o777).toBe(0o640);
    expect(fs.readdirSync(path.dirname(file()))).toEqual(['PROD-1.yaml']);
  });

  it('validates the transform before writing and cleans up rejected saves', async () => {
    await expect(commit(revision(), () => {
      expectUnchanged();
      throw new Error('Candidate identity is invalid');
    })).rejects.toThrow();
    expectUnchanged();
  });

  it('retains original bytes and mode and removes temporary files after a filesystem rename failure', async () => {
    const failRename = () => { throw Object.assign(new Error('Rename denied by filesystem'), { code: 'EACCES' }); };
    const syncRename = vi.spyOn(fs, 'renameSync').mockImplementation(failRename);
    const asyncRename = vi.spyOn(fs.promises, 'rename').mockImplementation(async () => failRename());
    const callbackRename = vi.spyOn(fs, 'rename').mockImplementation((_old, _new, callback) => {
      callback(Object.assign(new Error('Rename denied by filesystem'), { code: 'EACCES' }));
    });
    try {
      await expect(commit(revision())).rejects.toMatchObject({ code: 'WRITE_FAILED' });
      expectUnchanged();
    } finally {
      syncRename.mockRestore();
      asyncRename.mockRestore();
      callbackRename.mockRestore();
    }
  });

  it('rechecks disk revision after transformation and retains intervening external bytes', async () => {
    const external = original.replace('Old', 'External');
    await expect(commit(revision(), () => {
      fs.writeFileSync(file(), external);
      return updated;
    })).rejects.toMatchObject({ code: 'REVISION_CONFLICT', status: 409 });
    expect(fs.readFileSync(file(), 'utf8')).toBe(external);
    expect(fs.readdirSync(path.dirname(file()))).toEqual(['PROD-1.yaml']);
  });

  it('allows exactly one of two queued writes with the same expected revision', async () => {
    const results = await Promise.allSettled([commit(revision()), commit(revision(), () => original.replace('Old', 'Other'))]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const failures = results.filter((result) => result.status === 'rejected');
    expect(failures).toHaveLength(1);
    expect((failures[0] as PromiseRejectedResult).reason).toMatchObject({ code: 'REVISION_CONFLICT', status: 409 });
    expect(fs.readdirSync(path.dirname(file()))).toEqual(['PROD-1.yaml']);
  });

  it('rejects lexical escapes from the docs root', async () => {
    const outside = path.join(sandbox, 'outside.yaml');
    fs.writeFileSync(outside, original);
    expect(() => readArtifact(root, '../outside.yaml')).toThrow();
    await expect(commitArtifact({ root, relativePath: '../outside.yaml', expectedRevision: revision(), transform: () => updated })).rejects.toThrow();
    expect(fs.readFileSync(outside, 'utf8')).toBe(original);
  });

  it('rejects paths through a directory symlink outside the docs root', async () => {
    const outside = path.join(sandbox, 'outside');
    fs.mkdirSync(outside);
    fs.writeFileSync(path.join(outside, 'PROD-1.yaml'), original);
    fs.symlinkSync(outside, path.join(root, 'escape'));
    expect(() => readArtifact(root, 'escape/PROD-1.yaml')).toThrow();
    await expect(commitArtifact({ root, relativePath: 'escape/PROD-1.yaml', expectedRevision: revision(), transform: () => updated })).rejects.toThrow();
    expect(fs.readFileSync(path.join(outside, 'PROD-1.yaml'), 'utf8')).toBe(original);
  });

  it('rejects writes to a file symlink even when its target is inside the docs root', async () => {
    fs.symlinkSync(file(), path.join(root, 'alias.yaml'));
    await expect(commitArtifact({ root, relativePath: 'alias.yaml', expectedRevision: revision(), transform: () => updated })).rejects.toThrow();
    expectUnchanged();
  });

  it('rejects non-regular files', async () => {
    expect(() => readArtifact(root, 'products')).toThrow();
    await expect(commitArtifact({ root, relativePath: 'products', expectedRevision: revision(), transform: () => updated })).rejects.toThrow();
    expectUnchanged();
  });

  it('serializes mutations for the same product and releases the queue after failure', async () => {
    let release!: () => void;
    let started!: () => void;
    const entered = new Promise<void>((resolve) => { started = resolve; });
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const events: string[] = [];
    const first = withProductMutation('PROD-1', async () => {
      events.push('first');
      started();
      await gate;
      events.push('first-failed');
      throw new Error('Rejected candidate');
    });
    const observedFirst = first.catch((error: Error) => error.message);
    await entered;
    const second = withProductMutation('PROD-1', async () => {
      events.push('second');
      return 'saved';
    });
    await Promise.resolve();
    expect(events).toEqual(['first']);
    release();
    expect(await observedFirst).toBe('Rejected candidate');
    expect(await second).toBe('saved');
    expect(events).toEqual(['first', 'first-failed', 'second']);
  });
});
