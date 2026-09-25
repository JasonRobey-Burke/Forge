import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { workspaceFixture, baseFiles } from '../test/workspaceFixture.js';

let fixture: Awaited<ReturnType<typeof workspaceFixture>>;
beforeEach(async () => { fixture = await workspaceFixture(); });
afterEach(() => fixture?.dispose());
const stale = '"' + '0'.repeat(64) + '"';
const mutations = [
  { method: 'put', url: '/api/products/PROD-1', file: 'products/PROD-1.yaml', body: { name: 'Changed' } },
  { method: 'put', url: '/api/intentions/INT-1', file: 'intentions/INT-1.yaml', body: { statement: 'Changed' } },
  { method: 'put', url: '/api/expectations/EXP-1', file: 'expectations/EXP-1.yaml', body: { description: 'Changed' } },
  { method: 'put', url: '/api/specs/SPEC-1', file: 'specs/SPEC-1.yaml', body: { title: 'Changed' } },
  { method: 'put', url: '/api/docs/raw/specs/SPEC-1', file: 'specs/SPEC-1.yaml', body: { content: baseFiles['specs/SPEC-1.yaml'].replace('First', 'Changed') } },
  { method: 'put', url: '/api/specs/SPEC-1/expectations', file: 'specs/SPEC-1.yaml', body: { expectation_ids: ['EXP-1'] } },
  { method: 'post', url: '/api/intentions/INT-1/dependencies', file: 'intentions/INT-1.yaml', body: { depends_on_id: 'INT-2' } },
  { method: 'delete', url: '/api/intentions/INT-1/dependencies/INT-2', file: 'intentions/INT-1.yaml', body: {} },
  { method: 'post', url: '/api/specs/SPEC-1/acknowledge-warnings', file: 'specs/SPEC-1.yaml', body: {} },
  { method: 'post', url: '/api/specs/SPEC-1/transition', file: 'specs/SPEC-1.yaml', body: { to_phase: 'Ready', override_reason: 'Reviewed sparse legacy artifact' } },
] as const;
function mutate(m: typeof mutations[number]) { return request(fixture.app)[m.method](m.url).send(m.body); }

describe('all artifact write preconditions', () => {
  for (const m of mutations) {
    it(`${m.method} ${m.url} requires If-Match before changing bytes`, async () => {
      const before = fixture.read(m.file);
      const response = await mutate(m);
      expect(response.status).toBe(428);
      expect(response.body.error.code).toBe('PRECONDITION_REQUIRED');
      expect(fixture.read(m.file)).toBe(before);
    });
    it(`${m.method} ${m.url} rejects stale revisions`, async () => {
      const before = fixture.read(m.file);
      const response = await mutate(m).set('If-Match', stale);
      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('REVISION_CONFLICT');
      expect(fixture.read(m.file)).toBe(before);
    });
  }
  it.each(['*', 'unquoted', 'W/"weak"'])('rejects malformed or wildcard revision %s', async (token) => {
    const response = await request(fixture.app).put('/api/products/PROD-1').set('If-Match', token).send({ name: 'Changed' });
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
    expect(fixture.read('products/PROD-1.yaml')).toBe(baseFiles['products/PROD-1.yaml']);
  });
});

describe('source envelopes and recoverable conflicts', () => {
  it.each([['product', 'products', 'PROD-1'], ['intention', 'intentions', 'INT-1'], ['expectation', 'expectations', 'EXP-1'], ['spec', 'specs', 'SPEC-1']])('exposes exact revisions for %s detail, list and raw reads', async (type, plural, id) => {
    const file = `${plural}/${id}.yaml`;
    const before = fixture.read(file);
    const expected = fixture.revision(file);
    for (const url of [`/api/${plural}/${id}`, `/api/docs/raw/${plural}/${id}`]) {
      const response = await request(fixture.app).get(url);
      expect(response.status).toBe(200);
      expect(response.body.error).toBeNull();
      expect(response.body.meta.source).toMatchObject({ revision: expected, path: file, repository_id: expect.any(String), read_only_fields: expect.any(Object) });
      expect(response.headers.etag).toBe(expected);
    }
    const list = await request(fixture.app).get(`/api/${plural}${plural === 'products' ? '' : '?product_id=PROD-1'}`);
    expect(list.body.meta.sources[id].revision).toBe(expected);
    expect(fixture.read(file)).toBe(before);
  });
  it('returns a fresh source envelope after a successful edit', async () => {
    const old = fixture.revision('products/PROD-1.yaml');
    const response = await request(fixture.app).put('/api/products/PROD-1').set('If-Match', old).send({ name: 'Changed' });
    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe('Changed');
    expect(response.body.error).toBeNull();
    expect(response.body.meta.source.revision).toBe(fixture.revision('products/PROD-1.yaml'));
    expect(response.headers.etag).toBe(response.body.meta.source.revision);
    expect(response.headers.etag).not.toBe(old);
  });
  it.each(['external edit', 'deletion'])('retains external state after %s', async (change) => {
    const file = 'products/PROD-1.yaml';
    const revision = fixture.revision(file);
    if (change === 'deletion') fs.unlinkSync(path.join(fixture.root, file));
    else fixture.write(file, baseFiles[file] + '# external\n');
    const response = await request(fixture.app).put('/api/products/PROD-1').set('If-Match', revision).send({ name: 'Changed' });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('REVISION_CONFLICT');
    if (change === 'deletion') expect(fs.existsSync(path.join(fixture.root, file))).toBe(false);
    else expect(fixture.read(file)).toBe(baseFiles[file] + '# external\n');
  });
});

describe('candidate and relationship validation', () => {
  it.each([
    ['different identity', baseFiles['specs/SPEC-1.yaml'].replace('SPEC-1', 'SPEC-OTHER')],
    ['different type', baseFiles['specs/SPEC-1.yaml'].replace('spec:', 'product:')],
    ['phase bypass', baseFiles['specs/SPEC-1.yaml'].replace('draft', 'done')],
    ['history bypass', baseFiles['specs/SPEC-1.yaml'] + '  phase_history: [{ from: Draft, to: Done }]\n'],
    ['gate bypass', baseFiles['specs/SPEC-1.yaml'] + '  gap_check: { status: passed, blockers: 0 }\n'],
  ])('rejects raw %s before touching disk', async (_label, content) => {
    const file = 'specs/SPEC-1.yaml';
    const response = await request(fixture.app).put('/api/docs/raw/specs/SPEC-1').set('If-Match', fixture.revision(file)).send({ content });
    expect(response.status).toBe(422);
    expect(fixture.read(file)).toBe(baseFiles[file]);
  });
  it('rejects an ordinary phase change', async () => {
    const response = await request(fixture.app).put('/api/specs/SPEC-1').set('If-Match', fixture.revision('specs/SPEC-1.yaml')).send({ phase: 'Done' });
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
    expect(fixture.read('specs/SPEC-1.yaml')).toBe(baseFiles['specs/SPEC-1.yaml']);
  });
  it.each(['INT-1', 'INT-3', 'INT-MISSING'])('rejects invalid dependency %s', async (id) => {
    const file = 'intentions/INT-1.yaml';
    const response = await request(fixture.app).post('/api/intentions/INT-1/dependencies').set('If-Match', fixture.revision(file)).send({ depends_on_id: id });
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
    expect(fixture.read(file)).toBe(baseFiles[file]);
  });
  it('rejects duplicate and cyclic links after a valid link', async () => {
    const add = await request(fixture.app).post('/api/intentions/INT-1/dependencies').set('If-Match', fixture.revision('intentions/INT-1.yaml')).send({ depends_on_id: 'INT-2' });
    expect(add.status).toBeGreaterThanOrEqual(200);
    expect(add.status).toBeLessThan(300);
    expect(add.body.meta.source.revision).toBe(fixture.revision('intentions/INT-1.yaml'));
    const duplicate = await request(fixture.app).post('/api/intentions/INT-1/dependencies').set('If-Match', fixture.revision('intentions/INT-1.yaml')).send({ depends_on_id: 'INT-2' });
    expect(duplicate.status).toBeGreaterThanOrEqual(400);
    const cyclic = await request(fixture.app).post('/api/intentions/INT-2/dependencies').set('If-Match', fixture.revision('intentions/INT-2.yaml')).send({ depends_on_id: 'INT-1' });
    expect(cyclic.status).toBeGreaterThanOrEqual(400);
  });
  it.each([{ ids: ['EXP-2'] }, { ids: ['EXP-MISSING'] }, { ids: ['EXP-1', 'EXP-1'] }])('rejects invalid expectation selection $ids', async ({ ids }) => {
    const file = 'specs/SPEC-1.yaml';
    const response = await request(fixture.app).put('/api/specs/SPEC-1/expectations').set('If-Match', fixture.revision(file)).send({ expectation_ids: ids });
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
    expect(fixture.read(file)).toBe(baseFiles[file]);
  });
  it('enforces Draft completeness and records an explicit override through transition', async () => {
    const file = 'specs/SPEC-1.yaml';
    const revision = fixture.revision(file);
    const blocked = await request(fixture.app).post('/api/specs/SPEC-1/transition').set('If-Match', revision).send({ to_phase: 'Ready' });
    expect(blocked.status).toBeGreaterThanOrEqual(400);
    expect(fixture.read(file)).toBe(baseFiles[file]);
    const allowed = await request(fixture.app).post('/api/specs/SPEC-1/transition').set('If-Match', revision).send({ to_phase: 'Ready', override_reason: 'Reviewed legacy sparse artifact' });
    expect(allowed.status).toBe(200);
    expect(allowed.body.meta.source.revision).toBe(fixture.revision(file));
    expect(fixture.read(file)).toContain('Reviewed legacy sparse artifact');
  });
});

describe('transition service gates', () => {
  it.each([
    ['ready', 'InProgress', '  gap_check: { status: failed, blockers: 1 }\n'],
    ['review', 'Validating', '  peer_reviewed: false\n'],
  ])('enforces %s gate before entering %s', async (phase, to_phase, extra) => {
    fixture.dispose();
    const text = baseFiles['specs/SPEC-1.yaml'].replace('status: draft', `status: ${phase}`) + extra;
    fixture = await workspaceFixture({ ...baseFiles, 'specs/SPEC-1.yaml': text });
    const response = await request(fixture.app).post('/api/specs/SPEC-1/transition').set('If-Match', fixture.revision('specs/SPEC-1.yaml')).send({ to_phase });
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
    expect(fixture.read('specs/SPEC-1.yaml')).toBe(text);
    expect(fixture.store.getPhaseHistory('SPEC-1')).toEqual([]);
  });
  it('permits exactly one concurrent transition into the final product WIP slot', async () => {
    fixture.dispose();
    const first = baseFiles['specs/SPEC-1.yaml'].replace('status: draft', 'status: in-progress');
    fixture = await workspaceFixture({ ...baseFiles, 'specs/SPEC-1.yaml': first, 'specs/SPEC-2.yaml': first.replace('SPEC-1', 'SPEC-2') });
    const responses = await Promise.all(['SPEC-1', 'SPEC-2'].map((id) => request(fixture.app).post(`/api/specs/${id}/transition`).set('If-Match', fixture.revision(`specs/${id}.yaml`)).send({ to_phase: 'Review' })));
    expect(responses.filter((r) => r.status === 200)).toHaveLength(1);
    expect(responses.filter((r) => r.status >= 400)).toHaveLength(1);
    expect(['SPEC-1', 'SPEC-2'].map((id) => fixture.store.getSpec(id)?.phase).filter((p) => p === 'Review')).toHaveLength(1);
    const histories = ['SPEC-1', 'SPEC-2'].map((id) => fixture.store.getPhaseHistory(id));
    expect(histories.map((h) => h.length).sort()).toEqual([0, 1]);
    const successIndex = responses.findIndex((r) => r.status === 200);
    const saved = parse(fixture.read(`specs/SPEC-${successIndex + 1}.yaml`)).spec;
    expect(saved.status ?? saved.phase).toBe('review');
  });
});

describe('successful write metadata', () => {
  for (const m of mutations.filter((m) => !m.url.endsWith('/transition'))) {
    it(`${m.method} ${m.url} preserves its success envelope and returns the committed source`, async () => {
      fixture.dispose();
      fixture = await workspaceFixture({
        ...baseFiles,
        'intentions/INT-1.yaml': baseFiles['intentions/INT-1.yaml'] + (m.method === 'delete' ? '  dependencies: [INT-2]\n' : ''),
        'specs/SPEC-1.yaml': baseFiles['specs/SPEC-1.yaml'] + (m.url.endsWith('/acknowledge-warnings') ? '  gap_check: { status: warnings, warnings: 2, blockers: 0, rounds: 1 }\n' : ''),
      });
      const response = await mutate(m).set('If-Match', fixture.revision(m.file));
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(300);
      expect(response.body.error).toBeNull();
      expect(response.body.data).not.toBeNull();
      expect(response.body.meta.source.revision).toBe(fixture.revision(m.file));
      expect(response.headers.etag).toBe(response.body.meta.source.revision);
    });
  }
});
