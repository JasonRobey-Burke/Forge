import { describe, it, expect } from 'vitest';
import yaml from 'js-yaml';
import { editDocument, inspectDocument, validateRawDocument } from './artifactDocument.js';

const product = { type: 'products' as const, id: 'PROD-1' };
const spec = { type: 'specs' as const, id: 'SPEC-1' };
const parse = (text: string) => yaml.load(text) as Record<string, any>;

describe('artifact document source contract', () => {
  it('returns exact bytes for a no-op patch', () => {
    const text = '# retained\nproduct:\n  id: PROD-1\n  name: "Forge" # title\n\n';
    expect(editDocument(text, product, {})).toBe(text);
  });

  it('changes only title in a wrapped source, retaining comments, dates, lifecycle and structured edge cases', () => {
    const text = '# document comment\nproduct:\n  id: PROD-1\n  title: Old # inline comment\n  status: legacy-pilot\n  created: 2025-01-02\n  edge_cases:\n    - condition: missing input\n      expected: {action: reject, code: 7}\n  extension:\n    nested: [one, {two: true}] # extension comment\n';
    const result = editDocument(text, product, { title: 'New' });
    expect(parse(result)).toEqual({ ...parse(text), product: { ...parse(text).product, title: 'New' } });
    expect(result).toContain('# document comment');
    expect(result).toContain('# inline comment');
    expect(result).toContain('created: 2025-01-02');
    expect(result).toContain('    nested: [one, {two: true}] # extension comment');
  });

  it('retains a flat document and its existing name alias', () => {
    const text = 'id: PROD-1\nname: Old\nextension: {nested: [1, 2]}\n';
    const result = parse(editDocument(text, product, { title: 'New' }));
    expect(result).toEqual({ id: 'PROD-1', name: 'New', extension: { nested: [1, 2] } });
  });

  it.each([
    ['problem_statement', 'problem', 'problem: Old\n'],
    ['vision', 'value_proposition', 'value_proposition: Old\n'],
    ['target_audience', 'audience', 'audience:\n  primary: Old\n  secondary: Keep\n'],
    ['context', 'technical_context', 'technical_context: Old\n'],
  ])('writes canonical %s through its existing source alias', (field, sourceField, fragment) => {
    const text = `id: PROD-1\n${fragment}extension: keep\n`;
    const result = parse(editDocument(text, product, { [field]: 'New' }));
    expect(result).toEqual({
      ...parse(text),
      [sourceField]: sourceField === 'audience' ? { primary: 'New', secondary: 'Keep' } : 'New',
    });
  });

  it('writes canonical spec phase through status without changing lifecycle metadata', () => {
    const text = 'spec:\n  id: SPEC-1\n  status: draft\n  approved_at: 2025-01-02\n  extension: keep\n';
    expect(parse(editDocument(text, spec, { phase: 'ready' }))).toEqual({
      spec: { ...parse(text).spec, status: 'ready' },
    });
  });

  it('preserves a legacy spec status when editing an unrelated title', () => {
    const text = 'spec:\n  id: SPEC-1\n  title: Old\n  status: historical-custom\n';
    expect(parse(editDocument(text, spec, { title: 'New' })).spec.status).toBe('historical-custom');
  });

  it('edits the full intention statement independently of rationale', () => {
    const text = 'intention:\n  id: INT-1\n  statement: Original purpose. Further detail.\n  rationale: Keep this separate.\n';
    const ref = { type: 'intentions' as const, id: 'INT-1' };
    const result = parse(editDocument(text, ref, { statement: 'New purpose. All of the detail.' }));
    expect(result.intention.statement).toBe('New purpose. All of the detail.');
    expect(result.intention.rationale).toBe('Keep this separate.');
    expect(result.intention).not.toHaveProperty('title');
  });

  it('explains and rejects editing a derived title without an explicit title or name', () => {
    const text = 'intention:\n  id: INT-1\n  statement: The full purpose.\n';
    const ref = { type: 'intentions' as const, id: 'INT-1' };
    expect(inspectDocument(text, ref).read_only_fields.title).toEqual(expect.any(String));
    expect(inspectDocument(text, ref).read_only_fields.title.length).toBeGreaterThan(0);
    expect(() => editDocument(text, ref, { title: 'Truncated' })).toThrow();
  });

  it('explains and rejects structured edge case form edits while accepting valid raw source', () => {
    const text = 'expectation:\n  id: EXP-1\n  title: Example\n  edge_cases:\n    - condition: absent\n      expected: reject\n';
    const ref = { type: 'expectations' as const, id: 'EXP-1' };
    expect(inspectDocument(text, ref).read_only_fields.edge_cases).toEqual(expect.any(String));
    expect(inspectDocument(text, ref).read_only_fields.edge_cases.length).toBeGreaterThan(0);
    expect(() => editDocument(text, ref, { edge_cases: ['flattened'] })).toThrow();
    expect(() => validateRawDocument(text.replace('expected: reject', 'expected: explain'), ref)).not.toThrow();
  });

  it.each([
    'name: &shared Old\nextension: *shared\n',
    'extension: &shared Old\nname: *shared\n',
  ])('makes anchored or aliased editable nodes read-only', (fragment) => {
    const text = `id: PROD-1\n${fragment}`;
    expect(inspectDocument(text, product).read_only_fields.title).toEqual(expect.any(String));
    expect(() => editDocument(text, product, { title: 'New' })).toThrow();
  });

  it('blocks writes affected by conflicting aliases without blocking unrelated changes', () => {
    const text = 'id: PROD-1\nname: Example\nproblem_statement: One\nproblem: Two\n';
    expect(() => editDocument(text, product, { problem_statement: 'New' })).toThrow();
    expect(parse(editDocument(text, product, { title: 'Changed' }))).toEqual({ ...parse(text), name: 'Changed' });
  });

  it('rejects duplicate-key form edits and accepts a valid raw repair', () => {
    const text = 'id: PROD-1\nname: First\nname: Second\n';
    expect(() => editDocument(text, product, { title: 'Third' })).toThrow();
    expect(() => validateRawDocument('id: PROD-1\nname: Repaired\n', product)).not.toThrow();
  });

  it.each([
    'product:\n  id: PROD-2\n  name: Changed identity\n',
    'expectation:\n  id: PROD-1\n  title: Wrong wrapper\n',
    'id: SPEC-1\ntitle: Wrong entity\n',
    'product: [malformed\n',
  ])('rejects invalid raw identity, type or YAML: %s', (text) => {
    expect(() => validateRawDocument(text, product)).toThrow();
  });
});
