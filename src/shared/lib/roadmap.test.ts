import { afterEach, describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import request from 'supertest';
import { readRoadmap, rankBetween, sortIntentions } from './roadmap.js';
import { editDocument } from '../../server/lib/artifactDocument.js';
import { workspaceFixture, baseFiles } from '../../server/test/workspaceFixture.js';
import type { Intention } from '../types/intention.js';
import type { Versioned } from '../types/source.js';

function intention(id: string, roadmap?: Intention['roadmap'], priority: Intention['priority'] = 'Medium', status: Intention['status'] = 'Defined'): Versioned<Intention> {
  return { data: { id, product_id: 'PROD-1', title: id, description: id, priority, status, roadmap, extras: {}, created_at: '', updated_at: '', archived_at: null }, source: { repository_id: 'repo', path: `intentions/${id}.yaml`, revision: '"' + 'a'.repeat(64) + '"', read_only_fields: {} } };
}
describe('independent planning metadata', () => {
  it.each([undefined, null])('leaves absent metadata unscheduled without migration: %s', value => {
    expect(readRoadmap(value)).toEqual({ metadata: null, unsupported: false });
  });
  it('preserves literal target labels without date interpretation', () => {
    const value = { bucket: 'next', rank: 1536, target_window: 'After partner review — no date agreed' };
    const original = structuredClone(value);
    expect(readRoadmap(value)).toEqual({ metadata: value, unsupported: false });
    expect(value).toEqual(original);
  });
  it.each([{ bucket: 'eventually' }, { rank: Infinity }, { rank: NaN }, { rank: '1024' }, { target_window: 2027 }, { future_field: true }, 'next'])('reports unsupported metadata without changing it: %j', value => {
    const original = structuredClone(value);
    expect(readRoadmap(value)).toEqual({ metadata: null, unsupported: true });
    expect(value).toEqual(original);
  });
  it.each([[null, null, 1024], [1024, 2048, 1536], [null, 1024, 0], [2048, null, 3072]] as const)('computes the one-record position between %s and %s', (before, after, expected) => {
    expect(rankBetween(before, after)).toBe(expected);
  });
  it.each([[1, 1 + Number.EPSILON], [Number.MAX_VALUE, null], [Infinity, null], [null, NaN]] as const)('rejects unrepresentable/nonfinite positions %s, %s with an actionable error', (before, after) => {
    expect(() => rankBetween(before, after)).toThrow(/precision|rank|reorder|finite|space|position/i);
  });
  it('orders buckets then ranks with ID ties; unranked intentions use priority and ID, independent of lifecycle', () => {
    const records = [intention('INT-Z', undefined, 'Critical', 'Fulfilled'), intention('INT-B', { bucket: 'now', rank: 2 }), intention('INT-A', { bucket: 'now', rank: 2 }), intention('INT-C', { bucket: 'next', rank: 1 }), intention('INT-D', { bucket: 'later', rank: 0 }), intention('INT-F', { bucket: 'now' }, 'Low'), intention('INT-E', { bucket: 'now' }, 'High'), intention('INT-Y', undefined, 'Critical')];
    const before = structuredClone(records);
    expect(sortIntentions(records).map(record => record.data.id)).toEqual(['INT-A', 'INT-B', 'INT-E', 'INT-F', 'INT-C', 'INT-D', 'INT-Y', 'INT-Z']);
    expect(records).toEqual(before);
  });
});
const source = '# planning stays independent\nintention:\n  id: INT-1\n  product: PROD-1\n  statement: Deliver reliable work\n  rationale: Keep canonical rationale\n  owner: Avery\n  priority: high\n  status: fulfilled # delivery status\n  dependencies: [INT-2]\n  forge:\n    custom_extension: { nested: [one, two] } # retained layout\n    roadmap:\n      bucket: now\n      rank: 1024\n      target_window: After partner review — no date agreed\n';
const ref = { type: 'intentions' as const, id: 'INT-1' };
describe('document preserving roadmap edits', () => {
  it('changes only planning metadata and preserves canonical fields and unrelated forge layout', () => {
    const result = editDocument(source, ref, { roadmap: { bucket: 'next', rank: 1536 } });
    const original = parse(source).intention;
    expect(parse(result).intention).toEqual({ ...original, forge: { ...original.forge, roadmap: { ...original.forge.roadmap, bucket: 'next', rank: 1536 } } });
    expect(result).toContain('# planning stays independent');
    expect(result).toContain('status: fulfilled # delivery status');
    expect(result).toContain('    custom_extension: { nested: [one, two] } # retained layout');
  });
  it('Unscheduled clears only bucket and rank; explicit null removes the target label', () => {
    const unscheduled = editDocument(source, ref, { roadmap: { bucket: null } });
    expect(parse(unscheduled).intention.forge.roadmap).toEqual({ target_window: 'After partner review — no date agreed' });
    const cleared = editDocument(unscheduled, ref, { roadmap: { target_window: null } });
    expect(parse(cleared).intention.forge.roadmap?.target_window).toBeUndefined();
    expect(parse(cleared).intention.status).toBe('fulfilled');
  });
  it('keeps unknown planning extensions through unrelated owner edits', () => {
    const unknown = source.replace('bucket: now', 'bucket: someday').replace('rank: 1024', 'rank: ancient');
    const result = editDocument(unknown, ref, { owner: 'Morgan' });
    expect(parse(result).intention.forge).toEqual(parse(unknown).intention.forge);
    expect(parse(result).intention.owner).toBe('Morgan');
  });
});
let fixture: Awaited<ReturnType<typeof workspaceFixture>> | undefined;
afterEach(() => { fixture?.dispose(); fixture = undefined; });
describe('editing fidelity through the public API', () => {
  it('preserves structured edge cases, unknown lifecycle and nested extensions on an owner-only patch', async () => {
    const text = 'expectation:\n  id: EXP-1\n  intention: INT-1\n  description: Measurable result\n  status: legacy-approved\n  edge_cases:\n    - condition: absent\n      expected: { action: reject, code: 7 } # keep structure\n  extension: { nested: [one, two] }\n';
    fixture = await workspaceFixture({ ...baseFiles, 'expectations/EXP-1.yaml': text });
    const response = await request(fixture.app).put('/api/expectations/EXP-1').set('If-Match', fixture.revision('expectations/EXP-1.yaml')).send({ owner: 'Morgan' });
    expect(response.status).toBe(200);
    const result = fixture.read('expectations/EXP-1.yaml');
    const saved = parse(result).expectation;
    expect(saved).toEqual({ ...parse(text).expectation, owner: 'Morgan', updated_at: expect.any(String) });
    expect(new Date(saved.updated_at).toISOString()).toBe(saved.updated_at);
    expect(result).toContain('      expected: { action: reject, code: 7 } # keep structure');
  });
  it('rejects newly introduced unknown lifecycle enum edits before changing bytes', async () => {
    fixture = await workspaceFixture();
    const file = 'expectations/EXP-1.yaml';
    const before = fixture.read(file);
    const response = await request(fixture.app).put('/api/expectations/EXP-1').set('If-Match', fixture.revision(file)).send({ status: 'invented-ready' });
    expect(response.status).toBeGreaterThanOrEqual(400); expect(response.status).toBeLessThan(500);
    expect(fixture.read(file)).toBe(before);
  });
  it('writes one roadmap rank without changing other intentions, source lifecycle or the linked spec', async () => {
    fixture = await workspaceFixture({ ...baseFiles, 'intentions/INT-1.yaml': source });
    const other = fixture.read('intentions/INT-2.yaml'); const spec = fixture.read('specs/SPEC-1.yaml');
    const response = await request(fixture.app).put('/api/intentions/INT-1').set('If-Match', fixture.revision('intentions/INT-1.yaml')).send({ roadmap: { bucket: 'later', rank: 1536 } });
    expect(response.status).toBe(200);
    expect(parse(fixture.read('intentions/INT-1.yaml')).intention.status).toBe('fulfilled');
    expect(parse(fixture.read('intentions/INT-1.yaml')).intention.forge.roadmap).toEqual({ bucket: 'later', rank: 1536, target_window: 'After partner review — no date agreed' });
    expect(fixture.read('intentions/INT-2.yaml')).toBe(other); expect(fixture.read('specs/SPEC-1.yaml')).toBe(spec);
  });
});
