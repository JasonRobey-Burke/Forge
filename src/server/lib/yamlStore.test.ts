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

describe('YamlStore — edit-experience operations', () => {
  let docsDir: string;

  function write(sub: string, name: string, lines: string[]) {
    fs.writeFileSync(path.join(docsDir, sub, name), lines.join('\n') + '\n', 'utf-8');
  }

  beforeEach(() => {
    docsDir = tmpDocsDir();
    write('intentions', 'INT-1.yaml', [
      'intention:', '  id: "INT-1"', '  product_id: "PROD-1"', '  title: "One"', '  status: "defined"',
    ]);
    write('intentions', 'INT-2.yaml', [
      'intention:', '  id: "INT-2"', '  product_id: "PROD-2"', '  title: "Other product"', '  status: "defined"',
    ]);
    write('expectations', 'EXP-a.yaml', [
      'expectation:', '  id: "EXP-a"', '  intention_id: "INT-1"', '  title: "A"', '  status: "draft"',
      '  edge_cases: ["x", "y"]',
    ]);
    write('expectations', 'EXP-b.yaml', [
      'expectation:', '  id: "EXP-b"', '  intention_id: "INT-2"', '  title: "B"', '  status: "draft"',
      '  edge_cases: ["x", "y"]',
    ]);
    write('specs', 'SPEC-w.yaml', [
      'spec:', '  id: "SPEC-w"', '  product_id: "PROD-1"', '  title: "Warned"', '  status: "ready"',
      '  context: { stack: [], patterns: [], conventions: [], auth: "" }',
      '  gap_check:',
      '    status: "warnings"', '    blockers: 0', '    warnings: 2', '    rounds: 1',
    ]);
  });

  afterEach(() => {
    fs.rmSync(docsDir, { recursive: true, force: true });
  });

  it('lists expectations by product through the intention join', async () => {
    const store = new YamlStore(docsDir);
    await store.init();
    const exps = store.listExpectationsByProduct('PROD-1');
    expect(exps.map((e) => e.id)).toEqual(['EXP-a']);
  });

  it('updates depends_on and intentions and round-trips them through YAML', async () => {
    const store = new YamlStore(docsDir);
    await store.init();
    const updated = store.updateSpec('SPEC-w', { depends_on: ['SPEC-z'], intentions: ['INT-1'] });
    expect(updated?.depends_on).toEqual(['SPEC-z']);
    expect(updated?.intentions).toEqual(['INT-1']);

    const reread = new YamlStore(docsDir);
    await reread.init();
    expect(reread.getSpec('SPEC-w')?.depends_on).toEqual(['SPEC-z']);
    expect(reread.getSpec('SPEC-w')?.intentions).toEqual(['INT-1']);

    // clearing writes them away entirely
    store.updateSpec('SPEC-w', { depends_on: [] });
    const cleared = new YamlStore(docsDir);
    await cleared.init();
    expect(cleared.getSpec('SPEC-w')?.depends_on).toBeUndefined();
  });

  it('acknowledges gap-check warnings and persists through YAML write-back', async () => {
    const store = new YamlStore(docsDir);
    await store.init();
    const result = store.acknowledgeGapCheckWarnings('SPEC-w');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.spec.gap_check?.warnings_acknowledged).toBe(true);

    const reread = new YamlStore(docsDir);
    await reread.init();
    const gc = reread.getSpec('SPEC-w')?.gap_check;
    expect(gc?.status).toBe('warnings');
    expect(gc?.warnings_acknowledged).toBe(true);
    expect(gc?.warnings).toBe(2);
  });

  it('refuses acknowledgment when the gate is not in warnings status', async () => {
    write('specs', 'SPEC-p.yaml', [
      'spec:', '  id: "SPEC-p"', '  product_id: "PROD-1"', '  title: "Passed"', '  status: "ready"',
      '  gap_check: { status: "passed", blockers: 0, warnings: 0, rounds: 2 }',
    ]);
    const store = new YamlStore(docsDir);
    await store.init();
    const result = store.acknowledgeGapCheckWarnings('SPEC-p');
    expect(result).toEqual({ ok: false, error: 'NOT_WARNINGS' });
    const missing = store.acknowledgeGapCheckWarnings('SPEC-nope');
    expect(missing).toEqual({ ok: false, error: 'NOT_FOUND' });
  });
});
