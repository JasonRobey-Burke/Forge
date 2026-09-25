import type { Product } from './product.js';
import type { Intention } from './intention.js';
import type { Expectation } from './expectation.js';
import type { Spec } from './spec.js';
import type { ArtifactRef, Versioned } from './source.js';

export interface WorkspaceConcern {
  key: string; code: string; entity: ArtifactRef; message: string;
  related: ArtifactRef[]; kind: 'attention' | 'unknown';
}
export interface EvidenceRef {
  path: string; spec_ids: string[]; expectation_ids: string[];
  kind: 'review' | 'execution' | 'gap-check' | 'pipeline' | 'other';
  availability: 'unknown' | 'present' | 'missing' | 'unreadable' | 'outside-root';
  result: 'unknown'; recorded_at?: string;
}
export interface WorkspaceSnapshot {
  product: Versioned<Product>;
  intentions: Versioned<Intention>[];
  expectations: Versioned<Expectation>[];
  specs: Versioned<Spec>[];
  spec_expectation_ids: Record<string, string[]>;
  intention_dependency_ids: Record<string, string[]>;
  evidence: EvidenceRef[];
  diagnostics: WorkspaceConcern[];
}
export interface WorkspaceProjection extends WorkspaceSnapshot {
  active_intention_ids: string[];
  coverage: { covered_ids: string[]; uncovered_ids: string[]; total: number };
  delivery: Record<string, string[]>;
  reported_validated_ids: string[];
  concerns: WorkspaceConcern[];
  incomplete: boolean;
}
