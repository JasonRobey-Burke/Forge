import { Priority, IntentionStatus } from './enums.js';

export interface Intention {
  id: string;
  product_id: string;
  title: string;
  description: string;
  priority: Priority;
  status: IntentionStatus;
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
  title?: string;
  description?: string;
  priority?: Priority;
  status?: IntentionStatus;
}
