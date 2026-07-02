import type { GapCheck } from '../types/spec.js';

/**
 * Normalize a raw gap_check YAML value into a typed GapCheck, tolerating
 * the shapes found in real repositories:
 *   - status in any case ("passed" / "PASS" is NOT accepted as passed — only
 *     the canonical enum values passed | blocked | warnings, case-insensitively)
 *   - blockers/warnings as integers OR as lists of finding IDs (legacy shape:
 *     the list length is the count)
 *   - missing rounds (legacy shape: round-derived metrics must treat the
 *     annotation as unconfirmed rather than assuming rounds === 1 is proven)
 * Returns null when the value is absent or unusable.
 */
export function normalizeGapCheck(raw: unknown): GapCheck | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const gc = raw as Record<string, unknown>;

  const statusRaw = typeof gc.status === 'string' ? gc.status.toLowerCase() : '';
  if (statusRaw !== 'passed' && statusRaw !== 'blocked' && statusRaw !== 'warnings') return null;

  return {
    status: statusRaw,
    blockers: toCount(gc.blockers),
    warnings: toCount(gc.warnings),
    rounds: typeof gc.rounds === 'number' && Number.isFinite(gc.rounds) ? gc.rounds : undefined,
    report: typeof gc.report === 'string' ? gc.report : undefined,
    date: typeof gc.date === 'string' ? gc.date : coerceDate(gc.date),
    warnings_acknowledged: gc.warnings_acknowledged === true ? true : undefined,
  };
}

/** Integer count, or list length for legacy finding-ID-list annotations. */
function toCount(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.trunc(value));
  if (Array.isArray(value)) return value.length;
  return 0;
}

/** YAML may parse an unquoted date field as a Date object. */
function coerceDate(value: unknown): string | undefined {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return undefined;
}

// ── Gate check (Ready → In Progress) ────────────────────────────────────

export type GapCheckGateCode =
  | 'GAP_CHECK_REQUIRED'
  | 'GAP_CHECK_BLOCKED'
  | 'GAP_CHECK_WARNINGS_UNACKNOWLEDGED';

export interface GapCheckGateResult {
  allowed: boolean;
  code?: GapCheckGateCode;
  message?: string;
}

/**
 * The IDD gap-check gate policy for entering execution (Ready → In Progress):
 *   - no annotation      → the Spec has not been gated; execution should not start
 *   - blocked            → unresolved Blockers; execution must not start
 *   - warnings           → allowed only when a human has recorded acknowledgment
 *                          (gap_check.warnings_acknowledged: true)
 *   - passed             → allowed
 * Forge records overrides with a reason rather than hard-refusing — the gate
 * here mirrors the framework's doctrine; the override audit trail preserves
 * accountability when a human chooses to proceed anyway.
 */
export function checkGapCheckGate(gapCheck: GapCheck | null | undefined): GapCheckGateResult {
  if (!gapCheck) {
    return {
      allowed: false,
      code: 'GAP_CHECK_REQUIRED',
      message: 'This Spec has not passed the gap-check gate. Run /idd-framework:gap-check before execution.',
    };
  }
  if (gapCheck.status === 'blocked') {
    return {
      allowed: false,
      code: 'GAP_CHECK_BLOCKED',
      message: `Gap-check reported ${gapCheck.blockers} unresolved Blocker${gapCheck.blockers === 1 ? '' : 's'}. Fix the findings in the Spec and re-run the gate.`,
    };
  }
  if (gapCheck.status === 'warnings' && gapCheck.warnings_acknowledged !== true) {
    return {
      allowed: false,
      code: 'GAP_CHECK_WARNINGS_UNACKNOWLEDGED',
      message: `Gap-check reported ${gapCheck.warnings} Warning${gapCheck.warnings === 1 ? '' : 's'} that no human has acknowledged. Review the report, then record gap_check.warnings_acknowledged: true.`,
    };
  }
  return { allowed: true };
}

// ── Badge descriptor (UI) ───────────────────────────────────────────────

export type GapCheckTone = 'passed' | 'warnings' | 'blocked' | 'ungated';

export interface GapCheckBadgeDescriptor {
  tone: GapCheckTone;
  label: string;
  detail: string;
}

/** Compact descriptor for rendering gate state on cards and detail headers. */
export function gapCheckBadge(gapCheck: GapCheck | null | undefined): GapCheckBadgeDescriptor {
  if (!gapCheck) {
    return { tone: 'ungated', label: 'Ungated', detail: 'No gap-check annotation — the adversarial gate has not run.' };
  }
  const rounds = gapCheck.rounds !== undefined ? `round ${gapCheck.rounds}` : 'rounds unrecorded';
  switch (gapCheck.status) {
    case 'passed':
      return { tone: 'passed', label: 'Gate ✓', detail: `Gap-check passed (${rounds}).` };
    case 'blocked':
      return { tone: 'blocked', label: `Blocked ×${gapCheck.blockers}`, detail: `Gap-check blocked: ${gapCheck.blockers} Blocker(s), ${gapCheck.warnings} Warning(s) (${rounds}).` };
    case 'warnings':
      return {
        tone: 'warnings',
        label: gapCheck.warnings_acknowledged ? `Warnings ✓ ×${gapCheck.warnings}` : `Warnings ×${gapCheck.warnings}`,
        detail: `Gap-check passed with ${gapCheck.warnings} Warning(s)${gapCheck.warnings_acknowledged ? ', acknowledged by a human' : ', not yet acknowledged'} (${rounds}).`,
      };
  }
}
