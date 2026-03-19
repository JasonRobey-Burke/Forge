import { prisma } from '../lib/prisma.js';
import { evaluateChecklist } from '../../shared/checklist/evaluator.js';
import { getSpec, getSpecExpectations } from './spec.js';
import type { ChecklistResult } from '../../shared/checklist/types.js';

export async function transitionSpec(
  specId: string,
  toPhase: string,
  userId: string,
  overrideReason?: string
): Promise<{ success: boolean; error?: string; checklist?: ChecklistResult }> {
  const spec = await getSpec(specId);
  if (!spec) return { success: false, error: 'not_found' };

  if (spec.phase === toPhase) return { success: false, error: 'same_phase' };

  // Gate: Draft → Ready requires checklist pass (unless overridden)
  if (spec.phase === 'Draft' && toPhase === 'Ready' && !overrideReason) {
    const expectations = await getSpecExpectations(specId);
    const checklist = evaluateChecklist(spec, expectations);
    if (!checklist.ready) {
      return { success: false, error: 'CHECKLIST_INCOMPLETE', checklist };
    }
  }

  // Transaction: update phase + create transition record
  await prisma.$transaction(async (tx) => {
    await tx.spec.update({ where: { id: specId }, data: { phase: toPhase } });
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
