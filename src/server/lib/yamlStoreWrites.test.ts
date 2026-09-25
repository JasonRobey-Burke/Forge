import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { workspaceFixture, baseFiles } from '../test/workspaceFixture.js';
let fixture: Awaited<ReturnType<typeof workspaceFixture>>;
beforeEach(async () => { fixture = await workspaceFixture(); });
afterEach(() => { vi.restoreAllMocks(); fixture?.dispose(); });
const productFile = 'products/PROD-1.yaml';
const productSource = () => fixture.store.getSource({ type: 'products', id: 'PROD-1' })!;

describe('store revision and preservation contract', () => {
  it('associates indexed fields with indexed bytes until reload', async () => {
    const before = productSource();
    fixture.write(productFile, baseFiles[productFile].replace('Demo', 'External'));
    expect(productSource().revision).toBe(before.revision);
    expect(fixture.store.getProduct('PROD-1')?.name).toBe('Demo');
    await expect(fixture.store.updateProduct('PROD-1', { name: 'Changed' }, before.revision)).rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
    expect(fixture.store.getProduct('PROD-1')?.name).toBe('Demo');
    expect(fixture.read(productFile)).toContain('External');
    await fixture.store.reloadFile(path.join(fixture.root, productFile));
    expect(fixture.store.getProduct('PROD-1')?.name).toBe('External');
    expect(productSource().revision).toBe(fixture.revision(productFile));
  });
  it('returns copies rather than mutable indexed originals', () => {
    const product = fixture.store.getProduct('PROD-1')!;
    product.name = 'Corrupted';
    const spec = fixture.store.getSpec('SPEC-1')!;
    spec.context.stack.push('Injected');
    expect(fixture.store.getProduct('PROD-1')?.name).toBe('Demo');
    expect(fixture.store.getSpec('SPEC-1')?.context.stack).toEqual([]);
    expect(fixture.read(productFile)).toBe(baseFiles[productFile]);
  });
  it('retains structured audience and unrelated extras during a simple product edit', async () => {
    fixture.dispose();
    const text = baseFiles[productFile] + '  audience:\n    primary: [Builders]\n    secondary: [Reviewers]\n  extension: { nested: [keep, me] }\n';
    fixture = await workspaceFixture({ ...baseFiles, [productFile]: text });
    await fixture.store.updateProduct('PROD-1', { name: 'Changed' }, fixture.revision(productFile));
    const doc = parse(fixture.read(productFile)).product;
    expect(doc.name).toBe('Changed');
    expect(doc.audience).toEqual({ primary: ['Builders'], secondary: ['Reviewers'] });
    expect(doc.extension).toEqual({ nested: ['keep', 'me'] });
  });
  it('retains structured edge cases and validation during an expectation edit', async () => {
    fixture.dispose();
    const file = 'expectations/EXP-1.yaml';
    const text = 'expectation:\n  id: EXP-1\n  intention: INT-1\n  description: Old\n  edge_cases:\n    - scenario: Empty\n      expected: Explain\n    - scenario: Conflict\n      expected: Retain text\n  validation_criteria:\n    automated: [unit, integration]\n    manual: Review\n  extra: keep\n';
    fixture = await workspaceFixture({ ...baseFiles, [file]: text });
    await fixture.store.updateExpectation('EXP-1', { description: 'Changed' }, fixture.revision(file));
    const before = parse(text).expectation;
    const after = parse(fixture.read(file)).expectation;
    expect(after.description).toBe('Changed');
    expect(after.edge_cases).toEqual(before.edge_cases);
    expect(after.validation_criteria).toEqual(before.validation_criteria);
    expect(after.extra).toBe('keep');
  });
  it('retains unknown legacy lifecycle values on unrelated saves and rejects a new unknown value', async () => {
    fixture.dispose();
    const file = 'intentions/INT-1.yaml';
    fixture = await workspaceFixture({ ...baseFiles, [file]: baseFiles[file] + '  status: historical-custom\n' });
    await fixture.store.updateIntention('INT-1', { statement: 'Changed' }, fixture.revision(file));
    expect(parse(fixture.read(file)).intention.status).toBe('historical-custom');
    const before = fixture.read(file);
    await expect(fixture.store.updateIntention('INT-1', { status: 'brand-new-invalid' } as never, fixture.revision(file))).rejects.toThrow();
    expect(fixture.read(file)).toBe(before);
  });
  it('validates new relationships before changing disk or the indexed entity', async () => {
    const before = fixture.store.getSpec('SPEC-1');
    await expect(fixture.store.updateSpec('SPEC-1', { intentions: ['INT-3'] }, fixture.revision('specs/SPEC-1.yaml'))).rejects.toThrow();
    expect(fixture.store.getSpec('SPEC-1')).toEqual(before);
    expect(fixture.read('specs/SPEC-1.yaml')).toBe(baseFiles['specs/SPEC-1.yaml']);
  });
  it('allows the existing peer_reviewed edit without a phase change', async () => {
    await fixture.store.updateSpec('SPEC-1', { peer_reviewed: true }, fixture.revision('specs/SPEC-1.yaml'));
    expect(fixture.store.getSpec('SPEC-1')?.peer_reviewed).toBe(true);
    expect(fixture.store.getSpec('SPEC-1')?.phase).toBe('Draft');
  });
  it('retains original disk and index and cleans temporary files on failed commit', async () => {
    const before = fixture.store.getProduct('PROD-1');
    const source = productSource();
    const fail = () => { throw Object.assign(new Error('Filesystem denied rename'), { code: 'EACCES' }); };
    vi.spyOn(fs, 'renameSync').mockImplementation(fail);
    vi.spyOn(fs.promises, 'rename').mockImplementation(async () => fail());
    vi.spyOn(fs, 'rename').mockImplementation((_old, _new, callback) => callback(Object.assign(new Error('Filesystem denied rename'), { code: 'EACCES' })));
    await expect(fixture.store.updateProduct('PROD-1', { name: 'Changed' }, source.revision)).rejects.toMatchObject({ code: 'WRITE_FAILED', message: expect.any(String) });
    expect(fixture.store.getProduct('PROD-1')).toEqual(before);
    expect(productSource()).toEqual(source);
    expect(fixture.read(productFile)).toBe(baseFiles[productFile]);
    expect(fs.readdirSync(path.join(fixture.root, 'products')).sort()).toEqual(['PROD-1.yaml', 'PROD-2.yaml']);
  });
});
