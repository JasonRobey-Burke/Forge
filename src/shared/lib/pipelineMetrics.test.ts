import { describe, it, expect } from 'vitest';
import { computePipelineMetrics, countSpecGaps, specIdFromExecutionReport, type PhaseHistoryLike } from './pipelineMetrics.js';
import type { Spec, GapCheck } from '../types/index.js';

function makeSpec(id: string, overrides: Partial<Spec> = {}): Spec {
  return {
    id,
    product_id: 'PROD-1',
    title: `Spec ${id}`,
    description: '',
    phase: 'Done',
    complexity: 'Medium',
    context: { stack: [], patterns: [], conventions: [], auth: '' },
    boundaries: [],
    deliverables: [],
    validation_automated: [],
    validation_human: [],
    peer_reviewed: false,
    extras: {},
    phase_changed_at: '2026-06-01T00:00:00Z',
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
    archived_at: null,
    ...overrides,
  } as Spec;
}

const gc = (status: GapCheck['status'], blockers: number, warnings: number, rounds?: number): GapCheck => ({
  status, blockers, warnings, rounds,
});

describe('computePipelineMetrics — gate', () => {
  it('computes the Gap-Check First-Round Pass Rate over confirmed rounds only', () => {
    const specs = [
      makeSpec('SPEC-a', { gap_check: gc('passed', 0, 0, 1) }),   // first-round pass
      makeSpec('SPEC-b', { gap_check: gc('passed', 0, 0, 2) }),   // confirmed, not first round
      makeSpec('SPEC-c', { gap_check: gc('passed', 0, 0) }),      // assumed (rounds unrecorded) — excluded
      makeSpec('SPEC-d'),                                          // ungated
    ];
    const m = computePipelineMetrics(specs, new Map(), new Map());
    expect(m.gate.gated).toBe(3);
    expect(m.gate.ungated).toBe(1);
    expect(m.gate.assumed).toBe(1);
    expect(m.gate.gap_check_first_round_pass_rate).toEqual({ passed_first_round: 1, confirmed: 2 });
  });

  it('derives first-round findings only when rounds === 1', () => {
    const specs = [
      makeSpec('SPEC-a', { gap_check: gc('warnings', 0, 3, 1) }),
      makeSpec('SPEC-b', { gap_check: gc('passed', 0, 0, 4) }),
    ];
    const m = computePipelineMetrics(specs, new Map(), new Map());
    expect(m.rows.find((r) => r.spec_id === 'SPEC-a')?.first_round_findings).toBe(3);
    expect(m.rows.find((r) => r.spec_id === 'SPEC-b')?.first_round_findings).toBe('not derivable');
  });

  it('never labels ungated specs as zero-finding', () => {
    const m = computePipelineMetrics([makeSpec('SPEC-x')], new Map(), new Map());
    const row = m.rows[0];
    expect(row.gate).toBe('ungated');
    expect(row.first_round_findings).toBeNull();
  });

  it('averages rounds-to-pass over cleared specs with recorded rounds', () => {
    const specs = [
      makeSpec('SPEC-a', { gap_check: gc('passed', 0, 0, 2) }),
      makeSpec('SPEC-b', { gap_check: gc('passed', 0, 0, 4) }),
      makeSpec('SPEC-c', { gap_check: gc('blocked', 2, 0, 1) }),  // not cleared — excluded
    ];
    const m = computePipelineMetrics(specs, new Map(), new Map());
    expect(m.gate.avg_rounds_to_pass).toBe(3);
  });
});

describe('computePipelineMetrics — flow', () => {
  const h = (from: string, to: string, timestamp: string): PhaseHistoryLike => ({ from, to, timestamp });

  it('computes review-stage First-Pass Rate from phase history', () => {
    const specs = [makeSpec('SPEC-a'), makeSpec('SPEC-b')];
    const histories = new Map<string, PhaseHistoryLike[]>([
      ['SPEC-a', [h('InProgress', 'Review', '2026-06-02T00:00:00Z'), h('Review', 'Validating', '2026-06-03T00:00:00Z')]],
      ['SPEC-b', [h('InProgress', 'Review', '2026-06-02T00:00:00Z'), h('Review', 'InProgress', '2026-06-03T00:00:00Z')]], // returned
    ]);
    const m = computePipelineMetrics(specs, histories, new Map());
    expect(m.flow.first_pass_rate_review).toEqual({ passed: 1, entered: 2 });
  });

  it('computes cycle time Ready → Done in days', () => {
    const specs = [makeSpec('SPEC-a')];
    const histories = new Map<string, PhaseHistoryLike[]>([
      ['SPEC-a', [h('Draft', 'Ready', '2026-06-01T00:00:00Z'), h('Validating', 'Done', '2026-06-03T00:00:00Z')]],
    ]);
    const m = computePipelineMetrics(specs, histories, new Map());
    expect(m.flow.avg_cycle_time_days).toBe(2);
  });

  it('reports review queue depth from current phases', () => {
    const specs = [makeSpec('SPEC-a', { phase: 'Review' }), makeSpec('SPEC-b', { phase: 'Done' })];
    const m = computePipelineMetrics(specs, new Map(), new Map());
    expect(m.flow.review_queue_depth).toBe(1);
  });
});

describe('countSpecGaps', () => {
  it('counts bulleted items', () => {
    expect(countSpecGaps('# Report\n\n## Spec Gaps Encountered\n\n- gap one\n- gap two\n\n## Next')).toBe(2);
  });

  it('counts numbered items', () => {
    expect(countSpecGaps('## spec_gaps_encountered\n\n1. first\n2. second\n3. third\n')).toBe(3);
  });

  it('counts table rows excluding header and separator', () => {
    const md = '## Spec Gaps Encountered\n\n| Gap | Severity |\n|---|---|\n| a | minor |\n| b | minor |\n';
    expect(countSpecGaps(md)).toBe(2);
  });

  it('reads explicit no-gaps prose as zero', () => {
    expect(countSpecGaps('## Spec Gaps Encountered\n\nNo spec gaps were encountered during implementation.\n')).toBe(0);
  });

  it('returns null when the mandatory section is missing', () => {
    expect(countSpecGaps('# Execution Report\n\nAll done.')).toBeNull();
  });
});

describe('specIdFromExecutionReport', () => {
  it('matches timestamped and plain execution report names', () => {
    expect(specIdFromExecutionReport('SPEC-8776-20260610T143200Z-execution.md')).toBe('SPEC-8776');
    expect(specIdFromExecutionReport('SPEC-a1b2-execution.md')).toBe('SPEC-a1b2');
    expect(specIdFromExecutionReport('SPEC-a1b2-gap-check.md')).toBeNull();
  });
});
