import { z } from 'zod';
import { ProductStatus } from '../types/enums.js';

export const productContextSchema = z.object({
  stack: z.array(z.string()),
  patterns: z.array(z.string()),
  conventions: z.array(z.string()),
  auth: z.string(),
});

export const wipLimitsSchema = z.object({
  draft: z.number().int().min(0),
  ready: z.number().int().min(0),
  in_progress: z.number().int().min(0),
  review: z.number().int().min(0),
  validating: z.number().int().min(0),
});

export const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  problem_statement: z.string().min(1),
  vision: z.string().min(1),
  target_audience: z.string().min(1),
  status: z.enum(Object.values(ProductStatus) as [string, ...string[]]).optional(),
  context: productContextSchema.optional(),
  wip_limits: wipLimitsSchema.optional(),
});

export const updateProductSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  problem_statement: z.string().min(1).optional(),
  vision: z.string().min(1).optional(),
  target_audience: z.string().min(1).optional(),
  status: z.enum(Object.values(ProductStatus) as [string, ...string[]]).optional(),
  context: productContextSchema.optional(),
  wip_limits: wipLimitsSchema.optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
