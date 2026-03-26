import { z } from 'zod';

export const createIntentionSchema = z.object({
  product_id: z.string().min(1),
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  priority: z.string().optional(),
  status: z.string().optional(),
});

export const updateIntentionSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().min(1).optional(),
  priority: z.string().optional(),
  status: z.string().optional(),
});

export type CreateIntentionInput = z.infer<typeof createIntentionSchema>;
export type UpdateIntentionInput = z.infer<typeof updateIntentionSchema>;
