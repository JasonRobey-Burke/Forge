import type { WipLimits } from '../types/product.js';

const phaseToWipKey: Record<string, keyof WipLimits | null> = {
  Draft: 'draft',
  Ready: 'ready',
  InProgress: 'in_progress',
  Review: 'review',
  Validating: 'validating',
  Done: null,
};

export function getWipKeyForPhase(phase: string): keyof WipLimits | null {
  return phaseToWipKey[phase] ?? null;
}

export interface WipCheckResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  phase: string;
}

export function checkWipLimit(
  phase: string,
  currentCount: number,
  wipLimits: WipLimits
): WipCheckResult {
  const key = getWipKeyForPhase(phase);
  if (!key) return { allowed: true, currentCount, limit: 0, phase };
  const limit = wipLimits[key];
  if (limit === 0) return { allowed: true, currentCount, limit: 0, phase };
  return { allowed: currentCount < limit, currentCount, limit, phase };
}
