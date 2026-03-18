import { z } from 'zod';
import { Priority, IntentionStatus } from '../types/enums.js';

export const createIntentionSchema = z.object({
  product_id: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  priority: z.enum(Object.values(Priority) as [string, ...string[]]).optional(),
  status: z.enum(Object.values(IntentionStatus) as [string, ...string[]]).optional(),
});

export const updateIntentionSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().min(1).optional(),
  priority: z.enum(Object.values(Priority) as [string, ...string[]]).optional(),
  status: z.enum(Object.values(IntentionStatus) as [string, ...string[]]).optional(),
});

export type CreateIntentionInput = z.infer<typeof createIntentionSchema>;
export type UpdateIntentionInput = z.infer<typeof updateIntentionSchema>;
