import { describe, it, expect } from 'vitest';
import { evaluateChecklist } from './evaluator.js';
import type { Spec } from '../types/spec.js';
import type { ChecklistExpectation } from './types.js';
import { SpecPhase, Complexity } from '../types/enums.js';

// --- Helpers ---

function fullExpectation(overrides: Partial<ChecklistExpectation> = {}): ChecklistExpectation {
  return {
    id: 'exp-1',
    description: 'The system processes the request correctly',
    edge_cases: ['Network timeout occurs', 'User is unauthenticated'],
    ...overrides,
  };
}

function fullSpec(overrides: Partial<Spec> = {}): Spec {
  return {
    id: 'spec-1',
    product_id: 'prod-1',
    title: 'My Spec',
    description: 'A fully-populated spec',
    phase: SpecPhase.Draft,
    complexity: Complexity.Medium,
    context: {
      stack: ['React', 'Node.js'],
      patterns: ['REST API', 'Repository pattern'],
      conventions: ['camelCase for variables'],
      auth: 'Microsoft Entra ID with MSAL.js',
    },
    boundaries: ['No mobile support in this spec'],
    deliverables: ['Updated API endpoint', 'Updated UI page'],
    validation_automated: ['Unit tests for service layer'],
    validation_human: ['Manual QA walkthrough'],
    peer_reviewed: true,
    phase_changed_at: '2026-01-01T00:00:00.000Z',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    archived_at: null,
    extras: {},
    ...overrides,
  };
}

// --- Tests ---

describe('evaluateChecklist', () => {
  describe('fully-passing spec', () => {
    it('returns ready: true and 11/11 passed', () => {
      const result = evaluateChecklist(fullSpec(), [fullExpectation()]);
      expect(result.ready).toBe(true);
      expect(result.passed).toBe(11);
      expect(result.total).toBe(11);
      expect(result.items).toHaveLength(11);
    });

    it('returns empty message strings for all passing items', () => {
      const result = evaluateChecklist(fullSpec(), [fullExpectation()]);
      for (const item of result.items) {
        expect(item.message).toBe('');
      }
    });
  });

  describe('completely empty/default spec', () => {
    it('returns ready: false with multiple failures', () => {
      const emptySpec = fullSpec({
        context: { stack: [], patterns: [], conventions: [], auth: '' },
        boundaries: [],
        deliverables: [],
        validation_automated: [],
        validation_human: [],
        peer_reviewed: false,
      });
      const result = evaluateChecklist(emptySpec, []);
      expect(result.ready).toBe(false);
      // context-stack, context-patterns, context-conventions, context-auth,
      // expectations-linked, boundaries, deliverables, validation, peer-reviewed = 9 failures
      // expectations-desc and expectations-edges vacuously pass with empty array
      expect(result.passed).toBe(2);
      expect(result.total).toBe(11);
    });

    it('sets non-empty message for each failing item', () => {
      const emptySpec = fullSpec({
        context: { stack: [], patterns: [], conventions: [], auth: '' },
        boundaries: [],
        deliverables: [],
        validation_automated: [],
        validation_human: [],
        peer_reviewed: false,
      });
      const result = evaluateChecklist(emptySpec, []);
      const failingItems = result.items.filter((i) => !i.passed);
      for (const item of failingItems) {
        expect(item.message.length).toBeGreaterThan(0);
      }
    });
  });

  describe('individual criterion failures', () => {
    it('criterion 1 — context-stack fails when stack is empty', () => {
      const result = evaluateChecklist(
        fullSpec({ context: { stack: [], patterns: ['REST'], conventions: ['camelCase'], auth: 'JWT' } }),
        [fullExpectation()]
      );
      const item = result.items.find((i) => i.id === 'context-stack')!;
      expect(item.passed).toBe(false);
      expect(item.message.length).toBeGreaterThan(0);
      expect(result.ready).toBe(false);
      expect(result.passed).toBe(10);
    });

    it('criterion 2 — context-patterns fails when patterns is empty', () => {
      const result = evaluateChecklist(
        fullSpec({ context: { stack: ['React'], patterns: [], conventions: ['camelCase'], auth: 'JWT' } }),
        [fullExpectation()]
      );
      const item = result.items.find((i) => i.id === 'context-patterns')!;
      expect(item.passed).toBe(false);
      expect(result.passed).toBe(10);
    });

    it('criterion 3 — context-conventions fails when conventions is empty', () => {
      const result = evaluateChecklist(
        fullSpec({ context: { stack: ['React'], patterns: ['REST'], conventions: [], auth: 'JWT' } }),
        [fullExpectation()]
      );
      const item = result.items.find((i) => i.id === 'context-conventions')!;
      expect(item.passed).toBe(false);
      expect(result.passed).toBe(10);
    });

    it('criterion 4 — context-auth fails when auth is empty string', () => {
      const result = evaluateChecklist(
        fullSpec({ context: { stack: ['React'], patterns: ['REST'], conventions: ['camelCase'], auth: '' } }),
        [fullExpectation()]
      );
      const item = result.items.find((i) => i.id === 'context-auth')!;
      expect(item.passed).toBe(false);
      expect(result.passed).toBe(10);
    });

    it('criterion 5 — expectations-linked fails when no expectations provided', () => {
      const result = evaluateChecklist(fullSpec(), []);
      const item = result.items.find((i) => i.id === 'expectations-linked')!;
      expect(item.passed).toBe(false);
      expect(result.passed).toBe(10);
    });

    it('criterion 6 — expectations-desc fails when an expectation has empty description', () => {
      const result = evaluateChecklist(fullSpec(), [fullExpectation({ description: '' })]);
      const item = result.items.find((i) => i.id === 'expectations-desc')!;
      expect(item.passed).toBe(false);
      expect(result.passed).toBe(10);
    });

    it('criterion 7 — expectations-edges fails when an expectation has only 1 edge case', () => {
      const result = evaluateChecklist(fullSpec(), [fullExpectation({ edge_cases: ['Only one edge case'] })]);
      const item = result.items.find((i) => i.id === 'expectations-edges')!;
      expect(item.passed).toBe(false);
      expect(result.passed).toBe(10);
    });

    it('criterion 8 — boundaries fails when boundaries is empty', () => {
      const result = evaluateChecklist(fullSpec({ boundaries: [] }), [fullExpectation()]);
      const item = result.items.find((i) => i.id === 'boundaries')!;
      expect(item.passed).toBe(false);
      expect(result.passed).toBe(10);
    });

    it('criterion 9 — deliverables fails when deliverables is empty', () => {
      const result = evaluateChecklist(fullSpec({ deliverables: [] }), [fullExpectation()]);
      const item = result.items.find((i) => i.id === 'deliverables')!;
      expect(item.passed).toBe(false);
      expect(result.passed).toBe(10);
    });

    it('criterion 10 — validation fails when validation_automated is empty', () => {
      const result = evaluateChecklist(fullSpec({ validation_automated: [] }), [fullExpectation()]);
      const item = result.items.find((i) => i.id === 'validation')!;
      expect(item.passed).toBe(false);
      expect(result.passed).toBe(10);
    });

    it('criterion 10 — validation fails when validation_human is empty', () => {
      const result = evaluateChecklist(fullSpec({ validation_human: [] }), [fullExpectation()]);
      const item = result.items.find((i) => i.id === 'validation')!;
      expect(item.passed).toBe(false);
      expect(result.passed).toBe(10);
    });

    it('criterion 11 — peer-reviewed fails when peer_reviewed is false', () => {
      const result = evaluateChecklist(fullSpec({ peer_reviewed: false }), [fullExpectation()]);
      const item = result.items.find((i) => i.id === 'peer-reviewed')!;
      expect(item.passed).toBe(false);
      expect(result.passed).toBe(10);
    });
  });

  describe('edge cases', () => {
    it('expectation with empty description — criterion 6 fails', () => {
      const result = evaluateChecklist(fullSpec(), [fullExpectation({ description: '' })]);
      const item = result.items.find((i) => i.id === 'expectations-desc')!;
      expect(item.passed).toBe(false);
    });

    it('expectation with whitespace-only description — criterion 6 fails', () => {
      const result = evaluateChecklist(fullSpec(), [fullExpectation({ description: '   ' })]);
      const item = result.items.find((i) => i.id === 'expectations-desc')!;
      expect(item.passed).toBe(false);
    });

    it('expectation with exactly 1 edge case — criterion 7 fails', () => {
      const result = evaluateChecklist(fullSpec(), [fullExpectation({ edge_cases: ['just one'] })]);
      const item = result.items.find((i) => i.id === 'expectations-edges')!;
      expect(item.passed).toBe(false);
    });

    it('expectation with exactly 2 edge cases — criterion 7 passes', () => {
      const result = evaluateChecklist(fullSpec(), [fullExpectation({ edge_cases: ['edge 1', 'edge 2'] })]);
      const item = result.items.find((i) => i.id === 'expectations-edges')!;
      expect(item.passed).toBe(true);
    });

    it('no expectations linked — criterion 5 fails, criteria 6 and 7 vacuously pass', () => {
      const result = evaluateChecklist(fullSpec(), []);
      const linked = result.items.find((i) => i.id === 'expectations-linked')!;
      const desc = result.items.find((i) => i.id === 'expectations-desc')!;
      const edges = result.items.find((i) => i.id === 'expectations-edges')!;
      expect(linked.passed).toBe(false);
      expect(desc.passed).toBe(true);  // every() on empty array = true
      expect(edges.passed).toBe(true); // every() on empty array = true
    });

    it('context.auth whitespace-only — criterion 4 fails', () => {
      const result = evaluateChecklist(
        fullSpec({ context: { stack: ['React'], patterns: ['REST'], conventions: ['camelCase'], auth: '   ' } }),
        [fullExpectation()]
      );
      const item = result.items.find((i) => i.id === 'context-auth')!;
      expect(item.passed).toBe(false);
    });

    it('multiple expectations — all must pass for criteria 6 and 7 to pass', () => {
      const expectations = [
        fullExpectation({ id: 'exp-1', edge_cases: ['e1', 'e2'] }),
        fullExpectation({ id: 'exp-2', edge_cases: ['only one'] }), // this one fails criterion 7
      ];
      const result = evaluateChecklist(fullSpec(), expectations);
      const edges = result.items.find((i) => i.id === 'expectations-edges')!;
      expect(edges.passed).toBe(false);
    });

    it('multiple expectations — all passing satisfies criteria 6 and 7', () => {
      const expectations = [
        fullExpectation({ id: 'exp-1', description: 'First', edge_cases: ['e1', 'e2'] }),
        fullExpectation({ id: 'exp-2', description: 'Second', edge_cases: ['e3', 'e4'] }),
      ];
      const result = evaluateChecklist(fullSpec(), expectations);
      const desc = result.items.find((i) => i.id === 'expectations-desc')!;
      const edges = result.items.find((i) => i.id === 'expectations-edges')!;
      expect(desc.passed).toBe(true);
      expect(edges.passed).toBe(true);
    });
  });

  describe('result structure', () => {
    it('always has exactly 11 items', () => {
      const result = evaluateChecklist(fullSpec(), [fullExpectation()]);
      expect(result.items).toHaveLength(11);
      expect(result.total).toBe(11);
    });

    it('all items have required fields', () => {
      const result = evaluateChecklist(fullSpec(), [fullExpectation()]);
      for (const item of result.items) {
        expect(typeof item.id).toBe('string');
        expect(item.id.length).toBeGreaterThan(0);
        expect(typeof item.criterion).toBe('string');
        expect(item.criterion.length).toBeGreaterThan(0);
        expect(typeof item.passed).toBe('boolean');
        expect(typeof item.message).toBe('string');
      }
    });

    it('passed count matches items with passed === true', () => {
      const result = evaluateChecklist(
        fullSpec({ peer_reviewed: false, boundaries: [] }),
        [fullExpectation()]
      );
      const manualCount = result.items.filter((i) => i.passed).length;
      expect(result.passed).toBe(manualCount);
      expect(result.passed).toBe(9);
    });

    it('ready is false when passed < 11', () => {
      const result = evaluateChecklist(fullSpec({ peer_reviewed: false }), [fullExpectation()]);
      expect(result.passed).toBe(10);
      expect(result.ready).toBe(false);
    });
  });
});
