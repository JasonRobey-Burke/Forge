import { getStore } from '../lib/yamlStore.js';
import { getSpec, getSpecExpectations, countSpecsByPhase } from './spec.js';
import { getProduct } from './product.js';
import { evaluateTransitionEligibility, type TransitionEligibility } from '../../shared/lib/transitionEligibility.js';

export async function transitionSpec(specId: string, toPhase: string, userId: string,
  overrideReason?: string, expectedRevision: string = ''): Promise<TransitionEligibility> {
  return getStore().transition(specId, expectedRevision, async () => {
    const spec = await getSpec(specId);
    const result = spec ? evaluateTransitionEligibility(spec, toPhase,
      await getProduct(spec.product_id), await getSpecExpectations(specId),
      await countSpecsByPhase(spec.product_id, toPhase), overrideReason)
      : { success: false, error: 'not_found' };
    return { result, ...(result.success ? { change: { to: toPhase, userId, overrideReason } } : {}) };
  });
}
