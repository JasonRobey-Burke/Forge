import { ExpectationStatus } from './enums.js';

export interface Expectation {
  id: string;
  intention_id: string;
  title: string;
  description: string;
  status: ExpectationStatus;
  edge_cases: string[];
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface CreateExpectationInput {
  intention_id: string;
  title: string;
  description: string;
  status?: ExpectationStatus;
  edge_cases: string[];  // minimum 2 required
}

export interface UpdateExpectationInput {
  title?: string;
  description?: string;
  status?: ExpectationStatus;
  edge_cases?: string[];
}
