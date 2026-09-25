import { Priority, IntentionStatus } from './enums.js';

export interface RoadmapMetadata { bucket?: 'now' | 'next' | 'later'; rank?: number; target_window?: string }
export interface RoadmapPatch { bucket?: 'now' | 'next' | 'later' | null; rank?: number; target_window?: string | null }

export interface Intention {
  id: string;
  product_id: string;
  title: string;
  description: string;
  priority: Priority;
  status: IntentionStatus;
  rationale?: string;
  roadmap?: RoadmapMetadata;
  owner?: string;
  extras: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface CreateIntentionInput {
  product_id: string;
  title: string;
  description: string;
  priority?: Priority;
  status?: IntentionStatus;
}

export interface UpdateIntentionInput {
  dependencies?: string[];
  statement?: string;
  rationale?: string;
  roadmap?: RoadmapPatch;
  owner?: string;
  title?: string;
  description?: string;
  priority?: Priority;
  status?: IntentionStatus;
}
