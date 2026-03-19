export interface ChecklistItem {
  id: string;
  criterion: string;
  passed: boolean;
  message: string;
}

export interface ChecklistResult {
  items: ChecklistItem[];
  passed: number;
  total: number;
  ready: boolean;
}

// Minimal shape the evaluator needs
export interface ChecklistExpectation {
  id: string;
  description: string;
  edge_cases: string[];
}
