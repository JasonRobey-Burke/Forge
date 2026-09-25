import { z } from 'zod';

export const createIntentionSchema = z.object({
  product_id: z.string().min(1),
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  priority: z.string().optional(),
  status: z.string().optional(),
});

export const updateIntentionSchema = z.object({
  dependencies: z.array(z.string().min(1)).optional(),
  statement: z.string().min(1).optional(),
  rationale: z.string().optional(),
  roadmap: z.object({ bucket: z.enum(['now','next','later']).nullable().optional(), rank: z.number().finite().optional(), target_window: z.string().nullable().optional() }).strict().optional(),
  owner: z.string().optional(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().min(1).optional(),
  priority: z.string().optional(),
  status: z.string().optional(),
}).strict();

export type CreateIntentionInput = z.infer<typeof createIntentionSchema>;
export type UpdateIntentionInput = z.infer<typeof updateIntentionSchema>;
