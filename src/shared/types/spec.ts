import { SpecPhase, Complexity } from './enums.js';
import { ProductContext } from './product.js';

export interface Spec {
  id: string;
  product_id: string;
  title: string;
  description: string;
  phase: SpecPhase;
  complexity: Complexity;
  context: ProductContext;
  boundaries: string[];
  deliverables: string[];
  validation_automated: string[];
  validation_human: string[];
  peer_reviewed: boolean;
  owner?: string;
  depends_on?: string[];
  intentions?: string[];
  extras: Record<string, unknown>;
  phase_changed_at: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface CreateSpecInput {
  product_id: string;
  title: string;
  description: string;
  phase?: SpecPhase;
  complexity?: Complexity;
  context?: ProductContext;
  boundaries?: string[];
  deliverables?: string[];
  validation_automated?: string[];
  validation_human?: string[];
  expectation_ids?: string[];
}

export interface UpdateSpecInput {
  title?: string;
  description?: string;
  phase?: SpecPhase;
  complexity?: Complexity;
  context?: ProductContext;
  boundaries?: string[];
  deliverables?: string[];
  validation_automated?: string[];
  validation_human?: string[];
  peer_reviewed?: boolean;
}
