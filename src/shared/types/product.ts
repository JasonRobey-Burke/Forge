import { ProductStatus } from './enums.js';

export interface ProductContext {
  stack: string[];
  patterns: string[];
  conventions: string[];
  auth: string;
}

export interface WipLimits {
  draft: number;
  ready: number;
  in_progress: number;
  review: number;
  validating: number;
}

export interface Product {
  id: string;
  name: string;
  problem_statement: string;
  vision: string;
  target_audience: string;
  status: ProductStatus;
  context: ProductContext;
  wip_limits: WipLimits;
  owner?: string;
  version?: string;
  extras: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface CreateProductInput {
  name: string;
  problem_statement: string;
  vision: string;
  target_audience: string;
  status?: ProductStatus;
  context?: ProductContext;
  wip_limits?: WipLimits;
}

export interface UpdateProductInput {
  name?: string;
  problem_statement?: string;
  vision?: string;
  target_audience?: string;
  status?: ProductStatus;
  context?: ProductContext;
  wip_limits?: WipLimits;
}
