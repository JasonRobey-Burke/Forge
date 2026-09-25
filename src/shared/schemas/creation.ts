import { z } from 'zod';
const text = z.string().trim().min(1);
export const createIntentionDraftSchema = z.object({ product_id:text, statement:text, rationale:text, priority:z.enum(['critical','high','medium','low']), owner:text, confirmed:z.literal(true) }).strict();
export const createExpectationDraftSchema = z.object({ intention_id:text, description:text, validation_criteria:text, edge_cases:z.array(text).min(2).refine(values => new Set(values).size === values.length, 'Edge cases must be distinct'), complexity:z.enum(['low','medium','high']), owner:text, confirmed_edge_cases:z.literal(true), confirmed:z.literal(true) }).strict();
export type CreateIntentionDraft = z.infer<typeof createIntentionDraftSchema>;
export type CreateExpectationDraft = z.infer<typeof createExpectationDraftSchema>;
export const reparentExpectationSchema = z.object({ intention_id:text, old_parent_revision:text, new_parent_revision:text }).strict();
