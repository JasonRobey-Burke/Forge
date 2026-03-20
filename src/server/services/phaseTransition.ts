import { prisma } from '../lib/prisma.js';
import { evaluateChecklist } from '../../shared/checklist/evaluator.js';
import { getSpec, getSpecExpectations, countSpecsByPhase } from './spec.js';
import { getProduct } from './product.js';
import { checkWipLimit, type WipCheckResult } from '../../shared/lib/wipCheck.js';
import type { ChecklistResult } from '../../shared/checklist/types.js';

export async function transitionSpec(
  specId: string,
  toPhase: string,
  userId: string,
  overrideReason?: string
): Promise<{ success: boolean; error?: string; checklist?: ChecklistResult; wipCheck?: WipCheckResult }> {
  const spec = await getSpec(specId);
  if (!spec) return { success: false, error: 'not_found' };

  if (spec.phase === toPhase) return { success: false, error: 'same_phase' };

  if (!overrideReason) {
    // WIP limit check
    const product = await getProduct(spec.product_id);
    if (product) {
      const count = await countSpecsByPhase(spec.product_id, toPhase);
      const wipResult = checkWipLimit(toPhase, count, product.wip_limits);
      if (!wipResult.allowed) {
        return { success: false, error: 'WIP_LIMIT_EXCEEDED', wipCheck: wipResult };
      }
    }

    // Gate: Draft → Ready requires checklist pass
    if (spec.phase === 'Draft' && toPhase === 'Ready') {
      const expectations = await getSpecExpectations(specId);
      const checklist = evaluateChecklist(spec, expectations);
      if (!checklist.ready) {
        return { success: false, error: 'CHECKLIST_INCOMPLETE', checklist };
      }
    }

    // Gate: Review → Validating requires peer_reviewed
    if (spec.phase === 'Review' && toPhase === 'Validating') {
      if (!spec.peer_reviewed) {
        return { success: false, error: 'PEER_REVIEW_REQUIRED' };
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.spec.update({
      where: { id: specId },
      data: { phase: toPhase, phase_changed_at: new Date() },
    });
    await tx.phaseTransition.create({
      data: {
        spec_id: specId,
        from_phase: spec.phase,
        to_phase: toPhase,
        user_id: userId,
        override_reason: overrideReason ?? null,
      },
    });
  });

  return { success: true };
}
