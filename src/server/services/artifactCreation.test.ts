import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import promises from 'node:fs/promises';
import path from 'node:path';
import request from 'supertest';
import { parse } from 'yaml';
import { workspaceFixture, baseFiles } from '../test/workspaceFixture.js';
import { createIntentionDraft, createExpectationDraft } from './artifactCreation.js';
let fixture: Awaited<ReturnType<typeof workspaceFixture>>;
const intention = { product_id: 'PROD-1', statement: 'Improve **completion**', rationale: 'Reduce rework', priority: 'high' as const, owner: 'Avery', confirmed: true as const };
const expectation = { intention_id: 'INT-1', description: 'Complete within 2 seconds', validation_criteria: '95th percentile below 2s', edge_cases: ['No input returns guidance', 'Offline retains input'], complexity: 'medium' as const, owner: 'Avery', confirmed_edge_cases: true as const, confirmed: true as const };
beforeEach(async () => { fixture = await workspaceFixture({ ...baseFiles, 'products/PROD-1.yaml': baseFiles['products/PROD-1.yaml'] + '  exploration: EXPL-cafe\n  custom: { retain: [one, two] }\n', 'intentions/INT-1.yaml': baseFiles['intentions/INT-1.yaml'] + '  exploration: EXPL-cafe\n  expectations: [EXP-1]\n  custom: retain\n' }); });
afterEach(() => { vi.restoreAllMocks(); fixture?.dispose(); });
function snapshot() { return Object.fromEntries(['products', 'intentions', 'expectations', 'specs'].flatMap(dir => fs.readdirSync(path.join(fixture.root, dir)).map(name => [`${dir}/${name}`, fixture.read(`${dir}/${name}`)]))); }
describe('canonical Draft creation and parent backlinks', () => {
  it.each([
    { type: 'intentions', parentFile: 'products/PROD-1.yaml', parentKey: 'product', childKey: 'intention', parentId: 'PROD-1' },
    { type: 'expectations', parentFile: 'intentions/INT-1.yaml', parentKey: 'intention', childKey: 'expectation', parentId: 'INT-1' },
  ] as const)('creates the first Draft when the $type directory is absent', async ({ type, parentFile, parentKey, childKey, parentId }) => {
    const namespace = path.join(fixture.root, type);
    fs.rmSync(namespace, { recursive: true });
    expect(fs.existsSync(namespace)).toBe(false);
    const before = parse(fixture.read(parentFile))[parentKey];
    const parentRevision = fixture.revision(parentFile);
    const result = type === 'intentions'
      ? await createIntentionDraft(intention, parentRevision)
      : await createExpectationDraft(expectation, parentRevision);
    expect(fs.lstatSync(namespace).isDirectory()).toBe(true);
    expect(fs.lstatSync(namespace).isSymbolicLink()).toBe(false);
    expect(fs.readdirSync(namespace)).toEqual([path.basename(result.source.path)]);
    expect(result.source.path.startsWith(`${type}/`)).toBe(true);
    expect(result.source.revision).toBe(fixture.revision(result.source.path));
    expect(result.data.status).toBe('Draft');
    expect(parse(fixture.read(result.source.path))[childKey]).toMatchObject({ id: result.data.id, status: 'draft', [parentKey]: parentId });
    const after = parse(fixture.read(parentFile))[parentKey];
    expect(after[type]).toEqual([...(before[type] ?? []), result.data.id]);
    const { [type]: _oldLinks, updated_at: _oldUpdated, ...oldContent } = before;
    const { [type]: _newLinks, updated_at: _newUpdated, ...newContent } = after;
    expect(newContent).toEqual(oldContent);
  });
  it('creates a canonical intention with lineage and a fresh parsed source, retaining unrelated parent fields', async () => {
    const before = parse(fixture.read('products/PROD-1.yaml')).product;
    const result = await createIntentionDraft(intention, fixture.revision('products/PROD-1.yaml'));
    const saved = parse(fixture.read(result.source.path)).intention;
    expect(saved).toEqual({ id: result.data.id, product: 'PROD-1', statement: intention.statement, rationale: intention.rationale, priority: 'high', owner: 'Avery', status: 'draft', dependencies: [], expectations: [], exploration: 'EXPL-cafe' });
    expect(result.source.revision).toBe(fixture.revision(result.source.path)); expect(result.data.status).toBe('Draft');
    const parent = parse(fixture.read('products/PROD-1.yaml')).product;
    expect(parent.intentions).toContain(result.data.id); const { intentions: _links, updated_at: _updated, ...rest } = parent; const { intentions: _oldLinks, updated_at: _oldUpdated, ...oldRest } = before; expect(rest).toEqual(oldRest);
  });
  it('creates a canonical expectation and preserves existing backlinks', async () => {
    const result = await createExpectationDraft(expectation, fixture.revision('intentions/INT-1.yaml'));
    expect(parse(fixture.read(result.source.path)).expectation).toEqual({ id: result.data.id, intention: 'INT-1', description: expectation.description, validation_criteria: expectation.validation_criteria, edge_cases: expectation.edge_cases, complexity: 'medium', owner: 'Avery', status: 'draft', exploration: 'EXPL-cafe' });
    expect(parse(fixture.read('intentions/INT-1.yaml')).intention).toMatchObject({ expectations: ['EXP-1', result.data.id], custom: 'retain', exploration: 'EXPL-cafe' });
    expect(result.source.revision).toBe(fixture.revision(result.source.path)); expect(result.data.status).toBe('Draft');
  });
  it('does not invent absent exploration or approval evidence', async () => {
    const result = await createExpectationDraft({ ...expectation, intention_id: 'INT-2' }, fixture.revision('intentions/INT-2.yaml'));
    const raw = parse(fixture.read(result.source.path)).expectation;
    expect(raw).not.toHaveProperty('exploration'); expect(raw).not.toHaveProperty('confirmed'); expect(raw).not.toHaveProperty('confirmed_edge_cases'); expect(raw).not.toHaveProperty('approval_evidence');
  });
  it.each([['intentions', intention, 'products/PROD-1.yaml'], ['expectations', expectation, 'intentions/INT-1.yaml']] as const)('enforces parent preconditions on POST %s', async (type, body, file) => {
    const before = snapshot();
    const missing = await request(fixture.app).post(`/api/${type}`).send(body); expect(missing.status).toBe(428); expect(missing.body.error.code).toBe('PRECONDITION_REQUIRED');
    const stale = await request(fixture.app).post(`/api/${type}`).set('If-Match', '"' + '0'.repeat(64) + '"').send(body); expect(stale.status).toBe(409); expect(stale.body.error.code).toBe('REVISION_CONFLICT'); expect(snapshot()).toEqual(before);
    const good = await request(fixture.app).post(`/api/${type}`).set('If-Match', fixture.revision(file)).send(body); expect(good.status).toBe(201); expect(good.body.error).toBeNull(); expect(good.body.meta.source.revision).toBe(fixture.revision(good.body.meta.source.path));
  });
  it.each(['deleted', 'duplicate'])('rechecks %s parent state from disk before committing', async kind => {
    const rev = fixture.revision('intentions/INT-1.yaml');
    if (kind === 'deleted') fs.unlinkSync(path.join(fixture.root, 'intentions/INT-1.yaml')); else fixture.write('intentions/INT-duplicate.yaml', fixture.read('intentions/INT-1.yaml'));
    const before = snapshot(); await expect(createExpectationDraft(expectation, rev)).rejects.toThrow(); expect(snapshot()).toEqual(before);
  });
  it('retries a fresh identity after an external exclusive-create winner without linking or rewriting it', async () => {
    const open = promises.open.bind(promises);
    const before = snapshot();
    let externalPath = '', externalId = '', external = '';
    vi.spyOn(promises, 'open').mockImplementation(async (...args: Parameters<typeof promises.open>) => {
      const target = String(args[0]);
      if (!externalPath && path.dirname(target) === path.join(fixture.root, 'intentions') && target.endsWith('.yaml') && args[1] === 'wx') {
        const match = path.basename(target).match(/^(INT-[a-f0-9]+)(?:-.*)?\.yaml$/);
        expect(match).not.toBeNull();
        externalPath = path.relative(fixture.root, target); externalId = match![1];
        external = `intention:\n  id: ${externalId}\n  product: PROD-1\n  statement: External author outcome\n  rationale: Independently authored\n  priority: high\n  owner: External\n  status: draft\n  dependencies: []\n  expectations: []\n`;
        expect((await promises.readdir(path.join(fixture.root, '.forge-transactions'))).some(name => name.endsWith('.json'))).toBe(true);
        const winner = await open(args[0], 'wx');
        try { await winner.writeFile(external, 'utf8'); } finally { await winner.close(); }
      }
      return open(...args);
    });
    const response = await request(fixture.app).post('/api/intentions').set('If-Match', fixture.revision('products/PROD-1.yaml')).send(intention);
    expect(response.status).toBe(201);
    expect(externalPath).not.toBe('');
    expect(response.body.data.id).not.toBe(externalId);
    expect(fixture.read(externalPath)).toBe(external);
    expect(parse(fixture.read('products/PROD-1.yaml')).product.intentions).toEqual([response.body.data.id]);
    expect(parse(fixture.read(response.body.meta.source.path)).intention).toMatchObject({ id: response.body.data.id, statement: intention.statement, status: 'draft', product: 'PROD-1' });
    expect(response.body.meta.source.revision).toBe(fixture.revision(response.body.meta.source.path));
    const after = snapshot();
    expect(Object.keys(after).filter(file => !(file in before)).sort()).toEqual([externalPath, response.body.meta.source.path].sort());
    for (const [file, text] of Object.entries(before)) if (file !== 'products/PROD-1.yaml') expect(after[file]).toBe(text);
    expect((await promises.readdir(path.join(fixture.root, '.forge-transactions'))).filter(name => name.endsWith('.json'))).toEqual([]);
  });
  it('serializes concurrent creates against the same captured parent revision', async () => {
    const rev = fixture.revision('intentions/INT-1.yaml');
    const results = await Promise.all([1, 2].map(() => request(fixture.app).post('/api/expectations').set('If-Match', rev).send(expectation)));
    expect(results.map(r => r.status).sort()).toEqual([201, 409]);
    const winner = results.find(r => r.status === 201)!; expect(parse(fixture.read('intentions/INT-1.yaml')).intention.expectations).toEqual(['EXP-1', winner.body.data.id]);
  });
});
describe('same-product expectation reparent transaction', () => {
  function move(destination = 'INT-2') { return request(fixture.app).post('/api/expectations/EXP-1/reparent').set('If-Match', fixture.revision('expectations/EXP-1.yaml')).send({ intention_id: destination, old_parent_revision: fixture.revision('intentions/INT-1.yaml'), new_parent_revision: fixture.revision(`intentions/${destination}.yaml`) }); }
  it('preserves child identity/content/status and updates both backlinks', async () => {
    const before = parse(fixture.read('expectations/EXP-1.yaml')).expectation;
    const result = await move(); expect(result.status).toBe(200);
    const after = parse(fixture.read('expectations/EXP-1.yaml')).expectation; const { intention: _parent, updated_at: _updated, ...rest } = after; const { intention: _oldParent, updated_at: _oldUpdated, ...oldRest } = before; expect(rest).toEqual(oldRest); expect(after.intention).toBe('INT-2');
    expect(parse(fixture.read('intentions/INT-1.yaml')).intention.expectations).not.toContain('EXP-1'); expect(parse(fixture.read('intentions/INT-2.yaml')).intention.expectations).toContain('EXP-1');
  });
  it('rejects a different-product parent without changing files', async () => { const before = snapshot(); const result = await move('INT-3'); expect(result.status).toBeGreaterThanOrEqual(400); expect(result.status).toBeLessThan(500); expect(snapshot()).toEqual(before); });
  it('rejects stale parent revisions without changing any of the set', async () => {
    const before = snapshot(); const result = await request(fixture.app).post('/api/expectations/EXP-1/reparent').set('If-Match', fixture.revision('expectations/EXP-1.yaml')).send({ intention_id: 'INT-2', old_parent_revision: '"' + '0'.repeat(64) + '"', new_parent_revision: fixture.revision('intentions/INT-2.yaml') });
    expect(result.status).toBe(409); expect(snapshot()).toEqual(before);
  });
});
