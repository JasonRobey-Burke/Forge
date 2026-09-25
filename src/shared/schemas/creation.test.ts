import { describe, expect, it } from 'vitest';
import { createIntentionDraftSchema, createExpectationDraftSchema } from './creation';
const intention = { product_id: 'PROD-1', statement: 'Improve completion', rationale: 'Reduce rework', priority: 'high', owner: 'Avery', confirmed: true };
const expectation = { intention_id: 'INT-1', description: 'Complete within 2 seconds', validation_criteria: '95th percentile below 2s', edge_cases: ['No input returns guidance', 'Offline retains input'], complexity: 'medium', owner: 'Avery', confirmed_edge_cases: true, confirmed: true };
describe('reviewed Draft creation inputs', () => {
  it('trims all authored text and distinct edge cases', () => {
    expect(createIntentionDraftSchema.parse({ ...intention, statement: '  Improve completion  ' })).toEqual(intention);
    expect(createExpectationDraftSchema.parse({ ...expectation, edge_cases: expectation.edge_cases.map(v => ` ${v} `) })).toEqual(expectation);
  });
  for (const [schema, input] of [[createIntentionDraftSchema, intention], [createExpectationDraftSchema, expectation]] as const) {
    it.each(['id', 'status', 'title', 'approval_evidence'])('rejects caller-controlled %s', field => expect(schema.safeParse({ ...input, [field]: 'injected' }).success).toBe(false));
    it.each([false, undefined])('requires explicit final review confirmation %s', confirmed => expect(schema.safeParse({ ...input, confirmed }).success).toBe(false));
    it('rejects every empty authored text field', () => {
      for (const [key, value] of Object.entries(input)) if (typeof value === 'string') expect(schema.safeParse({ ...input, [key]: '  ' }).success).toBe(false);
    });
  }
  it.each([{ edge_cases: [] }, { edge_cases: ['One'] }, { edge_cases: ['One', ' '] }, { edge_cases: ['One', ' One '] }])('rejects incomplete or repeated cases $edge_cases', ({ edge_cases }) => expect(createExpectationDraftSchema.safeParse({ ...expectation, edge_cases }).success).toBe(false));
  it.each([false, undefined])('requires explicit edge confirmation %s', confirmed_edge_cases => expect(createExpectationDraftSchema.safeParse({ ...expectation, confirmed_edge_cases }).success).toBe(false));
});
