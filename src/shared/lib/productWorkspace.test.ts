import { describe, expect, it } from 'vitest';
import { projectWorkspace, collectWorkspaceDiagnostics } from './productWorkspace.js';
import type { WorkspaceSnapshot, WorkspaceConcern } from '../types/workspace.js';
import type { Product } from '../types/product.js';
import type { Intention } from '../types/intention.js';
import type { Expectation } from '../types/expectation.js';
import type { Spec } from '../types/spec.js';
import type { Versioned, ArtifactRef } from '../types/source.js';

const dates = { created_at: '', updated_at: '', archived_at: null, extras: {} };
const context = { stack: [], patterns: [], conventions: [], auth: '' };
function versioned<T extends { id: string }>(type: ArtifactRef['type'], data: T): Versioned<T> {
  return { data, source: { repository_id: 'repo', revision: '"' + 'a'.repeat(64) + '"', path: `${type}/${data.id}.yaml`, read_only_fields: {} } };
}
function intention(id = 'INT-1', overrides: Partial<Intention> = {}) {
  return versioned('intentions', { ...dates, id, product_id: 'PROD-1', title: id, description: '', priority: 'Medium', status: 'Draft', ...overrides } satisfies Intention);
}
function expectation(id = 'EXP-1', overrides: Partial<Expectation> = {}) {
  return versioned('expectations', { ...dates, id, intention_id: 'INT-1', title: id, description: '', status: 'Draft', edge_cases: ['a', 'b'], ...overrides } satisfies Expectation);
}
function spec(id = 'SPEC-1', overrides: Partial<Spec> = {}) {
  return versioned('specs', { ...dates, id, product_id: 'PROD-1', title: id, description: '', phase: 'Draft', complexity: 'Medium', context, boundaries: [], deliverables: [], validation_automated: [], validation_human: [], peer_reviewed: false, phase_changed_at: '', ...overrides } satisfies Spec);
}
function snapshot(overrides: Partial<WorkspaceSnapshot> = {}): WorkspaceSnapshot {
  const product: Product = { ...dates, id: 'PROD-1', name: 'Demo', problem_statement: '', vision: '', target_audience: '', status: 'Active', context, wip_limits: { draft: 0, ready: 0, in_progress: 0, review: 0, validating: 0 } };
  return { product: versioned('products', product), intentions: [], expectations: [], specs: [], spec_expectation_ids: {}, intention_dependency_ids: {}, evidence: [], diagnostics: [], ...overrides };
}
function hasConcern(concerns: WorkspaceConcern[], id: string, words: RegExp) {
  return concerns.some(c => (c.entity.id === id || c.related.some(r => r.id === id)) && words.test(c.message));
}

describe('workspace projection behavioral contract', () => {
  it('represents no expectations with an empty inspectable denominator', () => {
    const result = projectWorkspace(snapshot());
    expect(result.coverage).toEqual({ covered_ids: [], uncovered_ids: [], total: 0 });
    expect(result.active_intention_ids).toEqual([]);
    expect(result.reported_validated_ids).toEqual([]);
    expect(Object.values(result.delivery).flat()).toEqual([]);
    expect(result.incomplete).toBe(false);
  });

  it('counts a shared spec once while retaining each expectation relationship', () => {
    const result = projectWorkspace(snapshot({ intentions: [intention()], expectations: [expectation(), expectation('EXP-2')], specs: [spec()], spec_expectation_ids: { 'SPEC-1': ['EXP-1', 'EXP-2', 'EXP-1'] } }));
    expect(result.coverage.total).toBe(2);
    expect(result.coverage.covered_ids.slice().sort()).toEqual(['EXP-1', 'EXP-2']);
    expect(result.coverage.uncovered_ids).toEqual([]);
    expect(result.delivery.Draft).toEqual(['SPEC-1']);
    expect(result.spec_expectation_ids['SPEC-1']).toEqual(expect.arrayContaining(['EXP-1', 'EXP-2']));
  });

  it('keeps unlinked expectations uncovered and calls out the missing spec', () => {
    const result = projectWorkspace(snapshot({ intentions: [intention()], expectations: [expectation()] }));
    expect(result.coverage).toEqual({ covered_ids: [], uncovered_ids: ['EXP-1'], total: 1 });
    expect(hasConcern(result.concerns, 'EXP-1', /spec|cover/i)).toBe(true);
  });

  it('retains literal dangling IDs and reports their invalid relationship', () => {
    const result = projectWorkspace(snapshot({ intentions: [intention()], expectations: [expectation()], specs: [spec()], spec_expectation_ids: { 'SPEC-1': ['EXP-MISSING'] }, intention_dependency_ids: { 'INT-1': ['INT-MISSING'] } }));
    expect(result.spec_expectation_ids['SPEC-1']).toContain('EXP-MISSING');
    expect(result.intention_dependency_ids['INT-1']).toContain('INT-MISSING');
    expect(hasConcern(result.concerns, 'EXP-MISSING', /missing|broken|dangling|not found|unknown|invalid/i)).toBe(true);
    expect(hasConcern(result.concerns, 'INT-MISSING', /missing|broken|dangling|not found|unknown|invalid/i)).toBe(true);
    expect(result.coverage.covered_ids).toEqual([]);
  });

  it('scopes expectations through their intention and warns about conflicting product annotations', () => {
    const result = projectWorkspace(snapshot({ intentions: [intention(), intention('INT-OTHER', { product_id: 'PROD-2' })], expectations: [expectation('EXP-1', { product_id: 'PROD-2' }), expectation('EXP-OTHER', { intention_id: 'INT-OTHER', product_id: 'PROD-1' })] }));
    expect(result.active_intention_ids).toEqual(['INT-1']);
    expect(result.coverage.total).toBe(1);
    expect(result.coverage.uncovered_ids).toEqual(['EXP-1']);
    expect(hasConcern(result.concerns, 'EXP-1', /product|contradict|conflict/i)).toBe(true);
  });

  it('does not grant expectation coverage from a cross-product spec', () => {
    const result = projectWorkspace(snapshot({ intentions: [intention()], expectations: [expectation()], specs: [spec('SPEC-OTHER', { product_id: 'PROD-2' })], spec_expectation_ids: { 'SPEC-OTHER': ['EXP-1'] } }));
    expect(result.coverage.covered_ids).toEqual([]);
    expect(result.coverage.uncovered_ids).toEqual(['EXP-1']);
    expect(hasConcern(result.concerns, 'SPEC-OTHER', /product|cross/i)).toBe(true);
  });

  it('retains direct intention links without implying expectation coverage', () => {
    const result = projectWorkspace(snapshot({ intentions: [intention()], expectations: [expectation()], specs: [spec('SPEC-1', { intentions: ['INT-1'] })] }));
    expect(result.specs[0].data.intentions).toEqual(['INT-1']);
    expect(result.coverage.covered_ids).toEqual([]);
    expect(result.delivery.Draft).toEqual(['SPEC-1']);
  });

  it('excludes archived intentions and their expectations from active totals but retains sources', () => {
    const result = projectWorkspace(snapshot({ intentions: [intention('INT-1', { archived_at: '2026-01-01' })], expectations: [expectation()] }));
    expect(result.active_intention_ids).toEqual([]);
    expect(result.coverage.total).toBe(0);
    expect(result.intentions[0].data.id).toBe('INT-1');
    expect(result.expectations[0].data.id).toBe('EXP-1');
    expect(hasConcern(result.concerns, 'INT-1', /archiv/i)).toBe(true);
  });

  it('excludes archived expectations and archived specs from coverage and delivery totals', () => {
    const result = projectWorkspace(snapshot({ intentions: [intention()], expectations: [expectation(), expectation('EXP-OLD', { archived_at: '2026-01-01' })], specs: [spec('SPEC-OLD', { phase: 'Done', archived_at: '2026-01-01' })], spec_expectation_ids: { 'SPEC-OLD': ['EXP-1', 'EXP-OLD'] } }));
    expect(result.coverage).toEqual({ covered_ids: [], uncovered_ids: ['EXP-1'], total: 1 });
    expect(Object.values(result.delivery).flat()).not.toContain('SPEC-OLD');
    expect(result.specs.map(s => s.data.id)).toContain('SPEC-OLD');
    expect(hasConcern(result.concerns, 'SPEC-OLD', /archiv/i)).toBe(true);
  });

  it('reports Done delivery separately from reported expectation validation', () => {
    // Fulfilled is a legacy runtime status deliberately outside the current enum.
    const fulfilled = 'Fulfilled' as Expectation['status'];
    const result = projectWorkspace(snapshot({ intentions: [intention()], expectations: [expectation('EXP-DONE', { status: 'Done' }), expectation('EXP-FULFILLED', { status: fulfilled })], specs: [spec('SPEC-1', { phase: 'Done' })], spec_expectation_ids: { 'SPEC-1': ['EXP-DONE', 'EXP-FULFILLED'] } }));
    expect(result.delivery.Done).toEqual(['SPEC-1']);
    expect(result.reported_validated_ids).toEqual([]);
  });

  it('reports manually Validated status with unknown evidence, without inferring pass results', () => {
    const result = projectWorkspace(snapshot({ intentions: [intention()], expectations: [expectation('EXP-1', { status: 'Validated' })] }));
    expect(result.reported_validated_ids).toEqual(['EXP-1']);
    expect(hasConcern(result.concerns, 'EXP-1', /evidence/i)).toBe(true);
    expect(result.evidence).toEqual([]);
  });

  it('retains unknown phases as source values and counts them in Unknown', () => {
    // Existing legacy files may carry an unrecognized phase despite the TS enum.
    const phase = 'LegacyPending' as Spec['phase'];
    const result = projectWorkspace(snapshot({ specs: [spec('SPEC-1', { phase })] }));
    expect(result.specs[0].data.phase).toBe('LegacyPending');
    expect(result.delivery.Unknown).toEqual(['SPEC-1']);
    expect(Object.values(result.delivery).flat()).toEqual(['SPEC-1']);
  });

  it('marks parse-error snapshots incomplete and retains the diagnostic', () => {
    const diagnostic: WorkspaceConcern = { key: 'parse', code: 'PARSE_ERROR', entity: { type: 'specs', id: 'broken.yaml' }, message: 'Cannot parse specs/broken.yaml', related: [], kind: 'unknown' };
    const input = snapshot({ diagnostics: [diagnostic] });
    const result = projectWorkspace(input);
    expect(result.incomplete).toBe(true);
    expect(result.diagnostics).toContainEqual(diagnostic);
    expect(result.concerns).toContainEqual(diagnostic);
    expect(collectWorkspaceDiagnostics(input)).toContainEqual(diagnostic);
  });

  it('deduplicates source IDs in totals and marks duplicate records incomplete', () => {
    const result = projectWorkspace(snapshot({ intentions: [intention(), intention()], expectations: [expectation(), expectation()], specs: [spec(), spec()], spec_expectation_ids: { 'SPEC-1': ['EXP-1'] } }));
    expect(result.active_intention_ids).toEqual(['INT-1']);
    expect(result.coverage).toEqual({ covered_ids: ['EXP-1'], uncovered_ids: [], total: 1 });
    expect(result.delivery.Draft).toEqual(['SPEC-1']);
    expect(result.incomplete).toBe(true);
    expect(result.concerns.some(c => c.code === 'DUPLICATE_ID')).toBe(true);
  });

  it('deduplicates concerns for the same entity and cause', () => {
    const diagnostic: WorkspaceConcern = { key: 'parse-a', code: 'PARSE_ERROR', entity: { type: 'specs', id: 'broken.yaml' }, message: 'Cannot parse file', related: [], kind: 'unknown' };
    const input = snapshot({ diagnostics: [diagnostic, { ...diagnostic, key: 'parse-b' }] });
    for (const concerns of [projectWorkspace(input).concerns, collectWorkspaceDiagnostics(input)]) {
      expect(concerns.filter(c => c.entity.id === 'broken.yaml' && c.code === 'PARSE_ERROR')).toHaveLength(1);
    }
  });

  it('preserves missing evidence references as concerns, with result unknown', () => {
    const result = projectWorkspace(snapshot({ specs: [spec('SPEC-1', { phase: 'Done' })], evidence: [{ path: 'reports/missing.md', spec_ids: ['SPEC-1'], expectation_ids: [], kind: 'execution', availability: 'missing', result: 'unknown' }] }));
    expect(result.evidence[0]).toMatchObject({ path: 'reports/missing.md', result: 'unknown', availability: 'missing' });
    expect(hasConcern(result.concerns, 'SPEC-1', /evidence|report/i)).toBe(true);
    expect(result.delivery.Done).toEqual(['SPEC-1']);
  });

  it('does not mutate any snapshot input while projecting or collecting diagnostics', () => {
    const input = snapshot({ intentions: [intention()], expectations: [expectation()], specs: [spec()], spec_expectation_ids: { 'SPEC-1': ['EXP-1', 'EXP-1'] } });
    const before = structuredClone(input);
    projectWorkspace(input);
    collectWorkspaceDiagnostics(input);
    expect(input).toEqual(before);
  });
});
