import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { commitArtifactSet, recoverArtifactTransactions } from './artifactTransaction.js';
let root: string;
const parent = 'products/PROD-1.yaml';
const child = 'intentions/INT-abcd.yaml';
const old = 'product:\n  id: PROD-1\n  name: Original\n';
const proposed = old + '  intentions: [INT-abcd]\n';
const childText = 'intention:\n  id: INT-abcd\n  product: PROD-1\n';
const revision = (text: string) => `"${createHash('sha256').update(text).digest('hex')}"`;
const changes = () => [{ path: child, expectedRevision: null, text: childText }, { path: parent, expectedRevision: revision(old), text: proposed }];
const read = (relative: string) => fs.readFile(path.join(root, relative), 'utf8');
const journals = async () => (await fs.readdir(path.join(root, '.forge-transactions')).catch(() => [])).filter(v => v.endsWith('.json'));
beforeEach(async () => { root = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-transaction-')); await fs.mkdir(path.join(root, 'products')); await fs.mkdir(path.join(root, 'intentions')); await fs.writeFile(path.join(root, parent), old); });
afterEach(async () => { vi.restoreAllMocks(); await fs.rm(root, { recursive: true, force: true }); });
async function failParent(externalChild = false, preventRollback = false) {
  const rename = fs.rename.bind(fs);
  vi.spyOn(fs, 'rename').mockImplementation(async (from, to) => {
    if (String(to) === path.join(root, parent)) {
      expect(await read(child)).toBe(childText);
      const pending = await journals(); expect(pending.length).toBeGreaterThan(0);
      expect((await fs.stat(path.join(root, '.forge-transactions', pending[0]))).mode & 0o777).toBe(0o600);
      if (externalChild) await fs.writeFile(path.join(root, child), 'external work\n');
      throw Object.assign(new Error('Injected parent replacement failure'), { code: 'EACCES' });
    }
    return rename(from, to);
  });
  if (preventRollback) {
    const unlink = fs.unlink.bind(fs);
    vi.spyOn(fs, 'unlink').mockImplementation(async target => { if (String(target) === path.join(root, child)) throw new Error('Injected rollback failure'); return unlink(target); });
  }
}
describe('recoverable artifact set commits', () => {
  it('commits all files and removes the durable journal before success', async () => {
    await commitArtifactSet(root, changes()); expect(await read(parent)).toBe(proposed); expect(await read(child)).toBe(childText); expect(await journals()).toEqual([]);
  });
  it('retains the committed set after completed-marker directory sync fails and finalizes it on recovery', async () => {
    let completedMarkerReplaced = false;
    let injected = false;
    const rename = fs.rename.bind(fs);
    const open = fs.open.bind(fs);
    vi.spyOn(fs, 'rename').mockImplementation(async (from, to) => {
      await rename(from, to);
      if (path.dirname(String(to)) === path.join(root, '.forge-transactions') && String(to).endsWith('.json')) {
        const record = JSON.parse(await fs.readFile(to, 'utf8'));
        if (record.complete === true) completedMarkerReplaced = true;
      }
    });
    vi.spyOn(fs, 'open').mockImplementation(async (...args: Parameters<typeof fs.open>) => {
      const handle = await open(...args);
      if ((await handle.stat()).isDirectory()) {
        const sync = handle.sync.bind(handle);
        vi.spyOn(handle, 'sync').mockImplementation(async () => {
          if (completedMarkerReplaced && !injected) {
            injected = true;
            throw Object.assign(new Error('Injected completed-marker directory sync failure'), { code: 'EIO' });
          }
          return sync();
        });
      }
      return handle;
    });
    await expect(commitArtifactSet(root, changes())).rejects.toMatchObject({ code: 'RECOVERY_REQUIRED' });
    expect(completedMarkerReplaced).toBe(true);
    expect(injected).toBe(true);
    expect(await read(parent)).toBe(proposed);
    expect(await read(child)).toBe(childText);
    const pending = await journals();
    expect(pending.length).toBeGreaterThan(0);
    expect(JSON.parse(await fs.readFile(path.join(root, '.forge-transactions', pending[0]), 'utf8')).complete).toBe(true);
    await expect(commitArtifactSet(root, [{ path: parent, expectedRevision: revision(proposed), text: old }])).rejects.toMatchObject({ code: 'RECOVERY_REQUIRED' });
    expect(await read(parent)).toBe(proposed);
    vi.restoreAllMocks();
    expect(await recoverArtifactTransactions(root)).toEqual([]);
    expect(await journals()).toEqual([]);
    expect(await read(parent)).toBe(proposed);
    expect(await read(child)).toBe(childText);
    const laterParent = proposed + '# later reviewed edit\n';
    const laterChild = childText + '# later reviewed edit\n';
    await commitArtifactSet(root, [{ path: child, expectedRevision: revision(childText), text: laterChild }, { path: parent, expectedRevision: revision(proposed), text: laterParent }]);
    expect(await read(parent)).toBe(laterParent);
    expect(await read(child)).toBe(laterChild);
  });
  it('validates every precondition before creating a child', async () => {
    await fs.writeFile(path.join(root, parent), old + '# external\n');
    await expect(commitArtifactSet(root, changes())).rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
    await expect(read(child)).rejects.toMatchObject({ code: 'ENOENT' }); expect(await read(parent)).toBe(old + '# external\n');
  });
  it('never overwrites an existing exclusive child', async () => {
    await fs.writeFile(path.join(root, child), 'Existing content');
    await expect(commitArtifactSet(root, changes())).rejects.toMatchObject({ code: 'EEXIST' }); expect(await read(child)).toBe('Existing content'); expect(await read(parent)).toBe(old);
  });
  it('returns an exclusive collision without claiming an external child created after journaling', async () => {
    const external = 'intention:\n  id: INT-abcd\n  product: PROD-1\n  statement: External author outcome\n  rationale: Independently authored\n  priority: high\n  owner: External\n  status: draft\n  dependencies: []\n  expectations: []\n';
    const open = fs.open.bind(fs);
    let injected = false;
    vi.spyOn(fs, 'open').mockImplementation(async (...args: Parameters<typeof fs.open>) => {
      if (!injected && String(args[0]) === path.join(root, child) && args[1] === 'wx') {
        injected = true;
        expect((await journals()).length).toBeGreaterThan(0);
        const winner = await open(args[0], 'wx');
        try { await winner.writeFile(external, 'utf8'); } finally { await winner.close(); }
      }
      return open(...args);
    });
    await expect(commitArtifactSet(root, changes())).rejects.toMatchObject({ code: 'EEXIST' });
    expect(injected).toBe(true);
    expect(await read(child)).toBe(external);
    expect(await read(parent)).toBe(old);
    expect(await journals()).toEqual([]);
  });
  it('rolls back a created child after the second write fails', async () => {
    await failParent(); await expect(commitArtifactSet(root, changes())).rejects.toThrow();
    expect(await read(parent)).toBe(old); await expect(read(child)).rejects.toMatchObject({ code: 'ENOENT' }); expect(await journals()).toEqual([]);
  });
  it('preserves intervening external bytes and reports exact affected paths', async () => {
    await failParent(true);
    await expect(commitArtifactSet(root, changes())).rejects.toMatchObject({ code: 'RECOVERY_REQUIRED', message: expect.stringContaining(child) });
    expect(await read(child)).toBe('external work\n'); expect(await read(parent)).toBe(old); expect((await journals()).length).toBeGreaterThan(0);
    vi.restoreAllMocks();
    const concerns = await recoverArtifactTransactions(root);
    expect(concerns.some(c => c.message.includes(child))).toBe(true); expect(await read(child)).toBe('external work\n');
    await expect(commitArtifactSet(root, [{ path: child, expectedRevision: revision('external work\n'), text: childText }])).rejects.toMatchObject({ code: 'RECOVERY_REQUIRED' });
    expect(await read(child)).toBe('external work\n');
  });
  it('keeps affected-path recovery protection through an alias of the same docs root', async () => {
    const aliasRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-root-alias-'));
    const alias = path.join(aliasRoot, 'docs');
    try {
      await fs.symlink(root, alias);
      await failParent(true);
      await expect(commitArtifactSet(root, changes())).rejects.toMatchObject({ code: 'RECOVERY_REQUIRED' });
      vi.restoreAllMocks();
      expect(await read(child)).toBe('external work\n');
      await expect(commitArtifactSet(alias, [{ path: child, expectedRevision: revision('external work\n'), text: childText }])).rejects.toMatchObject({ code: 'RECOVERY_REQUIRED' });
      expect(await read(child)).toBe('external work\n');
      expect(await read(parent)).toBe(old);
      expect((await journals()).length).toBeGreaterThan(0);
    } finally { await fs.rm(aliasRoot, { recursive: true, force: true }); }
  });
  it('recovers an interrupted rollback using its actual persisted journal', async () => {
    await failParent(false, true); await expect(commitArtifactSet(root, changes())).rejects.toMatchObject({ code: 'RECOVERY_REQUIRED' });
    expect((await journals()).length).toBeGreaterThan(0); vi.restoreAllMocks();
    expect(await recoverArtifactTransactions(root)).toEqual([]); expect(await read(parent)).toBe(old);
    await expect(read(child)).rejects.toMatchObject({ code: 'ENOENT' }); expect(await journals()).toEqual([]);
  });
  it('treats paths in persisted journals as untrusted and preserves outside bytes', async () => {
    const outsideRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-outside-'));
    const outside = path.join(outsideRoot, 'outside.yaml');
    try {
      await fs.writeFile(outside, 'Outside content');
      await failParent(false, true); await expect(commitArtifactSet(root, changes())).rejects.toMatchObject({ code: 'RECOVERY_REQUIRED' }); vi.restoreAllMocks();
      const journal = path.join(root, '.forge-transactions', (await journals())[0]);
      const record = JSON.parse(await fs.readFile(journal, 'utf8'));
      expect(record.version).toBe(1); record.changes[0].path = path.relative(root, outside);
      await fs.writeFile(journal, JSON.stringify(record));
      const concerns = await recoverArtifactTransactions(root);
      expect(concerns.length).toBeGreaterThan(0); expect(concerns.some(c => /outside|unsafe|contain|escape|path/i.test(c.message))).toBe(true);
      expect(await fs.readFile(outside, 'utf8')).toBe('Outside content'); expect((await journals()).length).toBeGreaterThan(0);
    } finally { await fs.rm(outsideRoot, { recursive: true, force: true }); }
  });
  it.each([
    { label: 'object changes without completion', changes: {}, complete: undefined },
    { label: 'null change without completion', changes: [null], complete: undefined },
    { label: 'object changes marked complete', changes: {}, complete: true },
    { label: 'null change marked complete', changes: [null], complete: true },
    { label: 'truthy string completion flag', changes: undefined, complete: 'true' },
  ])('retains an untrusted journal with $label and returns a startup concern', async invalid => {
    await failParent(false, true);
    await expect(commitArtifactSet(root, changes())).rejects.toMatchObject({ code: 'RECOVERY_REQUIRED' });
    vi.restoreAllMocks();
    const journal = path.join(root, '.forge-transactions', (await journals())[0]);
    const record = JSON.parse(await fs.readFile(journal, 'utf8'));
    expect(record.version).toBe(1);
    if (invalid.changes !== undefined) record.changes = invalid.changes;
    if (invalid.complete === undefined) delete record.complete;
    else record.complete = invalid.complete;
    const malformed = JSON.stringify(record);
    await fs.writeFile(journal, malformed);
    const originalParent = await read(parent);
    const originalChild = await read(child);
    await expect(recoverArtifactTransactions(root)).resolves.toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'RECOVERY_REQUIRED', message: expect.stringMatching(/journal|invalid|malformed|recover|changes|complete/i) }),
    ]));
    expect(await fs.readFile(journal, 'utf8')).toBe(malformed);
    expect(await read(parent)).toBe(originalParent);
    expect(await read(child)).toBe(originalChild);
  });
  it('rejects an existing parent symlink outside before creating the child', async () => {
    const outsideRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-parent-outside-'));
    const outside = path.join(outsideRoot, 'PROD-1.yaml');
    try {
      await fs.writeFile(outside, old);
      await fs.unlink(path.join(root, parent));
      await fs.symlink(outside, path.join(root, parent));
      await expect(commitArtifactSet(root, changes())).rejects.toThrow();
      expect(await fs.readFile(outside, 'utf8')).toBe(old);
      expect(await fs.readlink(path.join(root, parent))).toBe(outside);
      await expect(read(child)).rejects.toMatchObject({ code: 'ENOENT' });
      expect(await fs.readdir(outsideRoot)).toEqual(['PROD-1.yaml']);
    } finally { await fs.rm(outsideRoot, { recursive: true, force: true }); }
  });
  it('rejects a journal directory symlink outside without writing journals or artifacts', async () => {
    const outsideRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-journal-outside-'));
    try {
      await fs.writeFile(path.join(outsideRoot, 'sentinel.txt'), 'Preserve outside bytes');
      await fs.symlink(outsideRoot, path.join(root, '.forge-transactions'));
      await expect(commitArtifactSet(root, changes())).rejects.toThrow();
      expect(await fs.readdir(outsideRoot)).toEqual(['sentinel.txt']);
      expect(await fs.readFile(path.join(outsideRoot, 'sentinel.txt'), 'utf8')).toBe('Preserve outside bytes');
      expect(await read(parent)).toBe(old);
      await expect(read(child)).rejects.toMatchObject({ code: 'ENOENT' });
    } finally { await fs.rm(outsideRoot, { recursive: true, force: true }); }
  });
  it('rejects paths outside the docs root without mutating the parent', async () => {
    await expect(commitArtifactSet(root, [{ path: '../outside.yaml', expectedRevision: null, text: 'escape' }, changes()[1]])).rejects.toThrow(); expect(await read(parent)).toBe(old);
  });
});
