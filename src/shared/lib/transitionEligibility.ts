import { evaluateChecklist } from '../checklist/evaluator.js';
import type { ChecklistResult, ChecklistExpectation } from '../checklist/types.js';
import type { Spec, Product } from '../types/index.js';
import { checkWipLimit, type WipCheckResult } from './wipCheck.js';
import { checkGapCheckGate, type GapCheckGateResult } from './gapCheck.js';

export interface TransitionEligibility {
  success: boolean; error?: string; checklist?: ChecklistResult;
  wipCheck?: WipCheckResult; gapCheckGate?: GapCheckGateResult;
}
/** The preview and mutation share gates; the caller supplies authoritative inputs. */
export function evaluateTransitionEligibility(spec: Spec, toPhase: string, product: Product | null,
  expectations: ChecklistExpectation[], targetCount: number, overrideReason?: string): TransitionEligibility {
  if (spec.phase === toPhase) return { success: false, error: 'same_phase' };
  if (overrideReason) return { success: true };
  if (product) {
    const wipCheck = checkWipLimit(toPhase, targetCount, product.wip_limits);
    if (!wipCheck.allowed) return { success: false, error: 'WIP_LIMIT_EXCEEDED', wipCheck };
  }
  if (spec.phase === 'Draft' && toPhase === 'Ready') {
    const checklist = evaluateChecklist(spec, expectations);
    if (!checklist.ready) return { success: false, error: 'CHECKLIST_INCOMPLETE', checklist };
  }
  if (spec.phase === 'Ready' && toPhase === 'InProgress') {
    const gapCheckGate = checkGapCheckGate(spec.gap_check);
    if (!gapCheckGate.allowed) return { success: false, error: gapCheckGate.code, gapCheckGate };
  }
  if (spec.phase === 'Review' && toPhase === 'Validating' && !spec.peer_reviewed)
    return { success: false, error: 'PEER_REVIEW_REQUIRED' };
  return { success: true };
}

/** Product-owner explanation shared by workspace attention and delivery controls. */
export function transitionExplanation(gate: TransitionEligibility): string {
  switch (gate.error) {
    case 'CHECKLIST_INCOMPLETE': return 'The Draft checklist is incomplete. Add the missing context, expectations, boundaries, deliverables or validation, and record peer review.';
    case 'WIP_LIMIT_EXCEEDED': return 'The destination has reached its work-in-progress limit. Finish work there or review product settings.';
    case 'PEER_REVIEW_REQUIRED': return 'Record peer review before moving this spec to Validating.';
    case 'SOURCE_GRAPH_INCOMPLETE': return 'Some source files or relationships could not be read. Repair them before reviewing the next transition.';
    case 'same_phase': return 'The spec is already in this phase.';
    default: return gate.gapCheckGate?.message ?? 'Review the gap-check report and resolve its findings before starting implementation.';
  }
}
