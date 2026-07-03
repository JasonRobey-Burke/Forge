import { SpecPhase, Complexity } from './enums.js';
import { ProductContext } from './product.js';

/**
 * The gap_check annotation written by the IDD gap-check gate
 * (docs/artifacts.md is the canonical schema home in the framework repo).
 * Counts are normalized to integers even when legacy annotations carry
 * finding-ID lists; `rounds` may be absent on legacy annotations, in which
 * case round-derived metrics treat the value as unconfirmed ("assumed 1").
 */
export interface GapCheck {
  status: 'passed' | 'blocked' | 'warnings';
  blockers: number;
  warnings: number;
  rounds?: number;
  report?: string;
  date?: string;
  warnings_acknowledged?: boolean;
}

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
  gap_check?: GapCheck;
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
  owner?: string;
  context?: ProductContext;
  boundaries?: string[];
  deliverables?: string[];
  validation_automated?: string[];
  validation_human?: string[];
  peer_reviewed?: boolean;
  depends_on?: string[];
  intentions?: string[];
}
