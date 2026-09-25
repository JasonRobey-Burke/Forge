import { z } from 'zod';

export const createExpectationSchema = z.object({
  intention_id: z.string().min(1),
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  status: z.string().optional(),
  edge_cases: z.array(z.string()).min(2),
});

export const updateExpectationSchema = z.object({
  validation_criteria: z.string().optional(),
  complexity: z.string().optional(),
  deferred_reason: z.string().optional(),
  owner: z.string().optional(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().min(1).optional(),
  status: z.string().optional(),
  edge_cases: z.array(z.string()).min(2).optional(),
}).strict();

export type CreateExpectationInput = z.infer<typeof createExpectationSchema>;
export type UpdateExpectationInput = z.infer<typeof updateExpectationSchema>;
