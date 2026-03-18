import { z } from 'zod';
import { ExpectationStatus } from '../types/enums.js';

export const createExpectationSchema = z.object({
  intention_id: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  status: z.enum(Object.values(ExpectationStatus) as [string, ...string[]]).optional(),
  edge_cases: z.array(z.string()).min(2),
});

export const updateExpectationSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().min(1).optional(),
  status: z.enum(Object.values(ExpectationStatus) as [string, ...string[]]).optional(),
  edge_cases: z.array(z.string()).min(2).optional(),
});

export type CreateExpectationInput = z.infer<typeof createExpectationSchema>;
export type UpdateExpectationInput = z.infer<typeof updateExpectationSchema>;
