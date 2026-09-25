import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { YamlStore } from './yamlStore.js';
import { baseFiles, workspaceFixture } from '../test/workspaceFixture.js';

const marker = 'DUMMY_OUTSIDE_DOCS_ROOT_CONTENT';
const source = 'specs/SPEC-1.yaml';
const outsideYaml = baseFiles[source].replace('First', marker);
const unsafeKinds = ['outside file symlink', 'outside directory symlink', 'nonregular YAML directory'] as const;
const cleanups: (() => void)[] = [];

afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
});

function tempRoot(prefix: string) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  cleanups.push(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

function installUnsafeSource(root: string, kind: typeof unsafeKinds[number]) {
  // The only outside data is known dummy YAML in a separate disposable root.
  const outside = tempRoot('forge-outside-read-');
  const outsideFile = path.join(outside, 'SPEC-1.yaml');
  fs.writeFileSync(outsideFile, outsideYaml);
  if (kind === 'outside directory symlink') {
    fs.rmSync(path.join(root, 'specs'), { recursive: true });
    fs.symlinkSync(outside, path.join(root, 'specs'), 'dir');
  } else {
    fs.unlinkSync(path.join(root, source));
    if (kind === 'outside file symlink') {
      fs.symlinkSync(outsideFile, path.join(root, source));
    } else {
      fs.mkdirSync(path.join(root, source));
      expect(fs.lstatSync(path.join(root, source)).isFile()).toBe(false);
      expect(fs.lstatSync(path.join(root, source)).isDirectory()).toBe(true);
    }
  }
  return () => expect(fs.readFileSync(outsideFile, 'utf8')).toBe(outsideYaml);
}

describe('artifact read containment', () => {
  it.each(unsafeKinds)('initialization rejects %s without blocking contained artifacts', async (kind) => {
    const root = tempRoot('forge-contained-read-');
    for (const directory of ['products', 'intentions', 'expectations', 'specs']) {
      fs.mkdirSync(path.join(root, directory));
    }
    for (const [relative, content] of Object.entries(baseFiles)) {
      fs.writeFileSync(path.join(root, relative), content);
    }
    const assertOutsideUnchanged = installUnsafeSource(root, kind);
    const store = new YamlStore(root);

    await store.init();

    expect.soft(store.getSpec('SPEC-1')).toBeNull();
    expect.soft(await store.getRawFileContent('specs', 'SPEC-1')).toBeNull();
    expect.soft(store.getProduct('PROD-1')?.name).toBe('Demo');
    expect.soft(store.getIntention('INT-1')?.title).toBe('One');
    expect.soft(store.getExpectation('EXP-1')?.description).toBe('A result');
    for (const [relative, content] of Object.entries(baseFiles)) {
      if (relative !== source) expect(fs.readFileSync(path.join(root, relative), 'utf8')).toBe(content);
    }
    assertOutsideUnchanged();
  });

  it.each(unsafeKinds)('a valid unrelated save never exposes a peer replaced by %s', async (kind) => {
    const fixture = await workspaceFixture();
    cleanups.push(fixture.dispose);
    const revision = fixture.revision('intentions/INT-1.yaml');
    const assertOutsideUnchanged = installUnsafeSource(fixture.root, kind);

    const saved = await request(fixture.app)
      .put('/api/intentions/INT-1')
      .set('If-Match', revision)
      .send({ statement: 'Legitimate contained edit' });

    expect.soft(saved.status).toBe(200);
    expect.soft(fixture.store.getIntention('INT-1')?.title).toBe('Legitimate contained edit');
    expect.soft(await fixture.store.getRawFileContent('intentions', 'INT-1')).toContain('Legitimate contained edit');
    // A rejected peer may be absent or retain its prior safe indexed value with a diagnostic.
    expect.soft(JSON.stringify(fixture.store.getSpec('SPEC-1'))).not.toContain(marker);
    const peer = fixture.store.getSpec('SPEC-1');
    if (peer) {
      expect.soft(peer.title).toBe('First');
      expect.soft(fixture.store.getParseErrors().length).toBeGreaterThan(0);
    }
    expect.soft(JSON.stringify(await fixture.store.getRawFileContent('specs', 'SPEC-1'))).not.toContain(marker);
    const raw = await request(fixture.app).get('/api/docs/raw/specs/SPEC-1');
    expect.soft(JSON.stringify(raw.body)).not.toContain(marker);
    const workspace = await request(fixture.app).get('/api/products/PROD-1/workspace');
    expect.soft(workspace.status).toBe(200);
    expect.soft(JSON.stringify(workspace.body)).not.toContain(marker);
    expect.soft(JSON.stringify(workspace.body)).toContain('Legitimate contained edit');
    assertOutsideUnchanged();
  });
});
