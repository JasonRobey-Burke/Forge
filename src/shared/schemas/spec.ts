import { z } from 'zod';
import { productContextSchema } from './product.js';

export const createSpecSchema = z.object({
  product_id: z.string().min(1),
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  phase: z.string().optional(),
  complexity: z.string().optional(),
  context: productContextSchema.optional(),
  boundaries: z.array(z.string()).optional(),
  deliverables: z.array(z.string()).optional(),
  validation_automated: z.array(z.string()).optional(),
  validation_human: z.array(z.string()).optional(),
  expectation_ids: z.array(z.string()).optional(),
});

export const updateSpecSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().min(1).optional(),
  phase: z.string().optional(),
  complexity: z.string().optional(),
  owner: z.string().optional(),
  context: productContextSchema.optional(),
  boundaries: z.array(z.string()).optional(),
  deliverables: z.array(z.string()).optional(),
  validation_automated: z.array(z.string()).optional(),
  validation_human: z.array(z.string()).optional(),
  peer_reviewed: z.boolean().optional(),
});

export type CreateSpecInput = z.infer<typeof createSpecSchema>;
export type UpdateSpecInput = z.infer<typeof updateSpecSchema>;
