import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { YamlStore } from './yamlStore.js';

function tmpDocsDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-yamlstore-'));
  for (const sub of ['products', 'intentions', 'expectations', 'specs']) {
    fs.mkdirSync(path.join(dir, sub), { recursive: true });
  }
  return dir;
}

describe('YamlStore — parse error handling', () => {
  let docsDir: string;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    docsDir = tmpDocsDir();
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    fs.rmSync(docsDir, { recursive: true, force: true });
    errorSpy.mockRestore();
  });

  it('loads specs with duplicated mapping keys (json: true lenient mode)', async () => {
    // Reproduces the JasonOS bug: spec-author emits `expectations:` twice
    // (once as ID list, once as detail). Default js-yaml throws; with json: true
    // the second key wins (last-write-wins, JSON semantics).
    const yaml = [
      'spec:',
      '  id: "SPEC-DUP"',
      '  product_id: "PROD-1"',
      '  title: "Dup keys"',
      '  status: "ready"',
      '  expectations:',
      '    - "EXP-A"',
      '    - "EXP-B"',
      '  context:',
      '    stack: []',
      '    patterns: []',
      '    conventions: []',
      '    auth: ""',
      '  expectations:',
      '    - id: "EXP-A"',
      '      description: "detail form"',
      '',
    ].join('\n');
    fs.writeFileSync(path.join(docsDir, 'specs', 'SPEC-DUP.yaml'), yaml, 'utf-8');

    const store = new YamlStore(docsDir);
    await store.init();

    const stats = store.getStats();
    expect(stats.specs).toBe(1);
    expect(stats.parseErrors).toEqual([]);
    expect(store.getSpec('SPEC-DUP')).not.toBeNull();
  });

  it('records a parseError for truly malformed YAML without breaking sibling files', async () => {
    // Indent mismatch — js-yaml rejects this even with json: true
    const broken = [
      'spec:',
      '  id: "SPEC-BAD"',
      '  title: "broken"',
      ' bad_indent: "x"',
      '',
    ].join('\n');
    const good = [
      'spec:',
      '  id: "SPEC-GOOD"',
      '  product_id: "PROD-1"',
      '  title: "ok"',
      '  status: "draft"',
      '',
    ].join('\n');
    const brokenPath = path.join(docsDir, 'specs', 'SPEC-BAD.yaml');
    fs.writeFileSync(brokenPath, broken, 'utf-8');
    fs.writeFileSync(path.join(docsDir, 'specs', 'SPEC-GOOD.yaml'), good, 'utf-8');

    const store = new YamlStore(docsDir);
    await store.init();

    const stats = store.getStats();
    expect(stats.specs).toBe(1); // good one loaded
    expect(stats.parseErrors).toHaveLength(1);
    expect(stats.parseErrors[0]?.filePath).toBe(brokenPath);
    expect(stats.parseErrors[0]?.message).toBeTruthy();
    // Ensure stderr was used so users see the failure
    expect(errorSpy).toHaveBeenCalled();
  });

  it('clears the parseError for a file once it parses cleanly on reload', async () => {
    const filePath = path.join(docsDir, 'specs', 'SPEC-FIX.yaml');
    fs.writeFileSync(filePath, 'spec:\n  id: "SPEC-FIX"\n bad_indent: x\n', 'utf-8');

    const store = new YamlStore(docsDir);
    await store.init();
    expect(store.getStats().parseErrors).toHaveLength(1);

    // User fixes the file
    fs.writeFileSync(
      filePath,
      'spec:\n  id: "SPEC-FIX"\n  product_id: "PROD-1"\n  title: "fixed"\n  status: "draft"\n',
      'utf-8',
    );
    store.reloadFile(filePath);

    const stats = store.getStats();
    expect(stats.parseErrors).toEqual([]);
    expect(stats.specs).toBe(1);
  });

  it('drops the parseError when a malformed file is removed', async () => {
    const filePath = path.join(docsDir, 'specs', 'SPEC-RM.yaml');
    fs.writeFileSync(filePath, 'spec:\n  id: "SPEC-RM"\n bad_indent: x\n', 'utf-8');

    const store = new YamlStore(docsDir);
    await store.init();
    expect(store.getStats().parseErrors).toHaveLength(1);

    store.removeFile(filePath);
    expect(store.getStats().parseErrors).toEqual([]);
  });
});
