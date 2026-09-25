import { afterEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import path from 'node:path';
import { workspaceFixture } from '../test/workspaceFixture.js';
import type { WorkspaceProjection } from '../../shared/types/workspace.js';

const files = {
  'products/PROD-1.yaml': 'product:\n  id: PROD-1\n  name: Demo\n',
  'intentions/INT-1.yaml': 'intention:\n  id: INT-1\n  product: PROD-1\n  statement: Outcome\n  dependencies: [INT-MISSING]\n',
  'expectations/EXP-1.yaml': 'expectation:\n  id: EXP-1\n  intention: INT-1\n  description: Result\n  edge_cases: [One, Two]\n',
  'specs/SPEC-1.yaml': 'spec:\n  id: SPEC-1\n  product: PROD-1\n  title: Delivery\n  status: done\n  expectations: [EXP-1, EXP-MISSING]\n  context: { stack: [], patterns: [], conventions: [], auth: "" }\n  validation: {}\n',
};
let fx: Awaited<ReturnType<typeof workspaceFixture>> | undefined;
afterEach(() => { fx?.dispose(); fx = undefined; });

function diskSnapshot(root: string): Record<string, { bytes: string; modified: number }> {
  const result: Record<string, { bytes: string; modified: number }> = {};
  function visit(relative: string) {
    for (const entry of fs.readdirSync(path.join(root, relative), { withFileTypes: true })) {
      const child = path.join(relative, entry.name);
      if (entry.isDirectory()) visit(child);
      else result[child] = { bytes: fs.readFileSync(path.join(root, child)).toString('base64'), modified: fs.statSync(path.join(root, child)).mtimeMs };
    }
  }
  visit('');
  return result;
}

describe.sequential('GET /api/products/:id/workspace', () => {
  it('returns the projection in the API envelope with exact per-record revision tokens and no writes', async () => {
    fx = await workspaceFixture(files);
    const before = diskSnapshot(fx.root);
    const response = await request(fx.app).get('/api/products/PROD-1/workspace');
    expect(response.status).toBe(200);
    expect(response.body.error).toBeNull();
    expect(response.body).toHaveProperty('meta');
    const data: WorkspaceProjection = response.body.data;
    expect(data.coverage).toEqual({ covered_ids: ['EXP-1'], uncovered_ids: [], total: 1 });
    expect(data.delivery.Done).toEqual(['SPEC-1']);
    expect(data.reported_validated_ids).toEqual([]);
    const artifacts = [data.product, ...data.intentions, ...data.expectations, ...data.specs];
    expect(artifacts).toHaveLength(4);
    for (const record of artifacts) {
      expect(record.source).toMatchObject({ repository_id: expect.any(String), read_only_fields: expect.any(Object) });
      expect(Object.keys(files)).toContain(record.source.path);
      expect(record.source.revision).toBe(fx.revision(record.source.path));
      expect(record.source.revision).toMatch(/^"[0-9a-f]{64}"$/);
    }
    expect(diskSnapshot(fx.root)).toEqual(before);
  });

  it('retains broken relationship IDs and their diagnostic references', async () => {
    fx = await workspaceFixture(files);
    const response = await request(fx.app).get('/api/products/PROD-1/workspace');
    expect(response.status).toBe(200);
    const data: WorkspaceProjection = response.body.data;
    expect(data.spec_expectation_ids['SPEC-1']).toContain('EXP-MISSING');
    expect(data.intention_dependency_ids['INT-1']).toContain('INT-MISSING');
    for (const id of ['EXP-MISSING', 'INT-MISSING']) {
      expect(data.concerns.some(c => c.entity.id === id || c.related.some(r => r.id === id))).toBe(true);
    }
  });

  it('returns 404 in the API envelope for an unknown product', async () => {
    fx = await workspaceFixture(files);
    const response = await request(fx.app).get('/api/products/PROD-MISSING/workspace');
    expect(response.status).toBe(404);
    expect(response.body.data).toBeNull();
    expect(response.body.error).toBeTruthy();
    expect(response.body).toHaveProperty('meta');
  });

  it('returns an incomplete projection when another artifact cannot be parsed', async () => {
    fx = await workspaceFixture({ ...files, 'specs/broken.yaml': 'spec: [unterminated\n' });
    const response = await request(fx.app).get('/api/products/PROD-1/workspace');
    expect(response.status).toBe(200);
    expect(response.body.error).toBeNull();
    const data: WorkspaceProjection = response.body.data;
    expect(data.incomplete).toBe(true);
    expect(data.diagnostics.some(c => c.code === 'PARSE_ERROR')).toBe(true);
    expect(data.concerns.some(c => c.code === 'PARSE_ERROR')).toBe(true);
    expect(data.product.data.id).toBe('PROD-1');
  });

  it('keeps duplicate IDs visible as incomplete diagnostics', async () => {
    fx = await workspaceFixture({ ...files, 'expectations/duplicate.yaml': files['expectations/EXP-1.yaml'] });
    const response = await request(fx.app).get('/api/products/PROD-1/workspace');
    expect(response.status).toBe(200);
    const data: WorkspaceProjection = response.body.data;
    expect(data.incomplete).toBe(true);
    expect(data.diagnostics.some(c => c.code === 'DUPLICATE_ID')).toBe(true);
    expect(data.coverage.total).toBe(1);
  });

  it('returns a synchronous copied snapshot without exposing mutable index state', async () => {
    fx = await workspaceFixture(files);
    const first = fx.store.getWorkspaceSnapshot('PROD-1');
    expect(first).not.toBeNull();
    expect(first).not.toBeInstanceOf(Promise);
    const before = structuredClone(first);
    first!.product.data.name = 'Changed by caller';
    first!.product.source.read_only_fields.injected = 'Changed by caller';
    first!.intentions[0].data.title = 'Changed by caller';
    first!.expectations[0].data.edge_cases.push('Changed by caller');
    first!.spec_expectation_ids['SPEC-1'].push('EXP-INJECTED');
    first!.intention_dependency_ids['INT-1'].push('INT-INJECTED');
    first!.diagnostics.length = 0;
    expect(fx.store.getWorkspaceSnapshot('PROD-1')).toEqual(before);
    expect(fx.store.getWorkspaceSnapshot('PROD-MISSING')).toBeNull();
  });
});
