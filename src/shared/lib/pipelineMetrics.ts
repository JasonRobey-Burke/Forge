import type { Spec } from '../types/index.js';

/**
 * Pipeline metrics, computed from artifacts already on disk — the gap_check
 * annotations, execution reports, and phase history the IDD pipeline emits.
 *
 * Naming discipline (matches the framework's metrics vocabulary):
 *   - "Gap-Check First-Round Pass Rate" is the GATE-stage metric: the share of
 *     gated Specs whose annotation records rounds === 1. It is deliberately
 *     NOT called "First-Pass Rate" — that name belongs to the REVIEW-stage
 *     metric (Specs passing Review without being returned), which Forge can
 *     compute from phase history.
 *   - Annotations without a recorded rounds value are "assumed" rows: excluded
 *     from BOTH the numerator and denominator of the first-round rate, because
 *     rounds === 1 cannot be confirmed for them.
 */

export interface PhaseHistoryLike {
  from: string;
  to: string;
  timestamp: string;
}

export interface SpecMetricsRow {
  spec_id: string;
  title: string;
  phase: string;
  gate: 'passed' | 'blocked' | 'warnings' | 'ungated';
  blockers: number | null; // null = ungated
  warnings: number | null; // null = ungated
  rounds: number | null; // null = unrecorded ("assumed" row)
  /** Final Blockers + Warnings when rounds === 1; otherwise the annotation
   *  preserves only final counts, so first-round findings are not derivable. */
  first_round_findings: number | 'not derivable' | null; // null = ungated
  execution_gaps: number | null; // null = no execution report found
}

export interface PipelineMetrics {
  gate: {
    gated: number;
    ungated: number;
    assumed: number;
    /** rounds === 1 count over confirmed-rounds gated Specs (assumed excluded). */
    gap_check_first_round_pass_rate: { passed_first_round: number; confirmed: number };
    avg_rounds_to_pass: number | null;
  };
  flow: {
    /** Review-stage First-Pass Rate: entered Review, never returned backward from Review. */
    first_pass_rate_review: { passed: number; entered: number };
    avg_cycle_time_days: number | null; // first Ready → first Done, from phase history
    review_queue_depth: number;
  };
  rows: SpecMetricsRow[];
}

const PHASE_ORDER = ['Draft', 'Ready', 'InProgress', 'Review', 'Validating', 'Done'];

export function computePipelineMetrics(
  specs: Spec[],
  histories: Map<string, PhaseHistoryLike[]>,
  executionGaps: Map<string, number>,
): PipelineMetrics {
  const rows: SpecMetricsRow[] = specs.map((spec) => {
    const gc = spec.gap_check;
    const rounds = gc ? (gc.rounds ?? null) : null;
    return {
      spec_id: spec.id,
      title: spec.title,
      phase: spec.phase,
      gate: gc ? gc.status : 'ungated',
      blockers: gc ? gc.blockers : null,
      warnings: gc ? gc.warnings : null,
      rounds,
      first_round_findings: !gc
        ? null
        : rounds === 1
          ? gc.blockers + gc.warnings
          : 'not derivable',
      execution_gaps: executionGaps.get(spec.id) ?? null,
    };
  });

  const gatedRows = rows.filter((r) => r.gate !== 'ungated');
  const confirmedRows = gatedRows.filter((r) => r.rounds !== null);
  const assumed = gatedRows.length - confirmedRows.length;
  const passedFirstRound = confirmedRows.filter((r) => r.rounds === 1).length;

  const clearedRounds = confirmedRows
    .filter((r) => r.gate === 'passed' || r.gate === 'warnings')
    .map((r) => r.rounds as number);
  const avgRounds = clearedRounds.length > 0
    ? clearedRounds.reduce((a, b) => a + b, 0) / clearedRounds.length
    : null;

  // ── Flow metrics from phase history ──────────────────────────────────
  let enteredReview = 0;
  let passedReview = 0;
  const cycleTimes: number[] = [];

  for (const spec of specs) {
    const history = histories.get(spec.id) ?? [];
    if (history.length === 0) continue;

    const reviewIdx = history.findIndex((h) => h.to === 'Review');
    if (reviewIdx !== -1) {
      enteredReview += 1;
      const returned = history.slice(reviewIdx + 1).some(
        (h) => h.from === 'Review' && PHASE_ORDER.indexOf(h.to) < PHASE_ORDER.indexOf('Review'),
      );
      if (!returned) passedReview += 1;
    }

    const readyEntry = history.find((h) => h.to === 'Ready');
    const doneEntry = history.find((h) => h.to === 'Done');
    if (readyEntry && doneEntry) {
      const ms = new Date(doneEntry.timestamp).getTime() - new Date(readyEntry.timestamp).getTime();
      if (Number.isFinite(ms) && ms >= 0) cycleTimes.push(ms / (1000 * 60 * 60 * 24));
    }
  }

  return {
    gate: {
      gated: gatedRows.length,
      ungated: rows.length - gatedRows.length,
      assumed,
      gap_check_first_round_pass_rate: { passed_first_round: passedFirstRound, confirmed: confirmedRows.length },
      avg_rounds_to_pass: avgRounds,
    },
    flow: {
      first_pass_rate_review: { passed: passedReview, entered: enteredReview },
      avg_cycle_time_days: cycleTimes.length > 0
        ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length
        : null,
      review_queue_depth: specs.filter((s) => s.phase === 'Review').length,
    },
    rows,
  };
}

// ── Execution-report gap counting ───────────────────────────────────────

const GAPS_HEADING = /^#{1,6}\s*(?:\d+\.\s*)?spec[\s_-]*gaps[\s_-]*encountered\b.*$/im;
const NO_GAPS_PROSE = /\bno\b[^.\n]*\bgaps?\b[^.\n]*\bencountered\b|\bno spec gaps\b/i;

/**
 * Count the entries in an execution report's mandatory spec_gaps_encountered
 * section. Tolerates the section shapes real reports use: bulleted lists,
 * numbered lists, table rows, and explicit "no gaps encountered" prose (0).
 * Returns null when the section heading is absent (malformed report).
 */
export function countSpecGaps(markdown: string): number | null {
  const headingMatch = GAPS_HEADING.exec(markdown);
  if (!headingMatch) return null;

  const afterHeading = markdown.slice(headingMatch.index + headingMatch[0].length);
  const nextHeading = afterHeading.search(/^#{1,6}\s/m);
  const section = nextHeading === -1 ? afterHeading : afterHeading.slice(0, nextHeading);

  const bulletItems = section.match(/^\s*(?:[-*]|\d+\.)\s+\S/gm)?.length ?? 0;
  if (bulletItems > 0) return bulletItems;

  // Table rows: pipe-delimited lines minus header and separator rows
  const tableLines = section.split('\n').filter((l) => /^\s*\|.*\|\s*$/.test(l));
  if (tableLines.length >= 2) {
    const dataRows = tableLines.filter((l) => !/^\s*\|[\s:|-]+\|\s*$/.test(l)).length - 1;
    return Math.max(0, dataRows);
  }

  if (NO_GAPS_PROSE.test(section)) return 0;

  // Section exists but holds free prose describing gaps — count paragraphs
  const paragraphs = section.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p.length > 0);
  return paragraphs.length > 0 && !NO_GAPS_PROSE.test(paragraphs[0]) ? paragraphs.length : 0;
}

/** Extract the spec id from an execution-report filename (suffix convention). */
export function specIdFromExecutionReport(fileName: string): string | null {
  const match = fileName.match(/^(SPEC-[A-Za-z0-9]+)-(?:\d{8}T\d{6}Z-)?execution\.md$/);
  return match ? match[1] : null;
}
