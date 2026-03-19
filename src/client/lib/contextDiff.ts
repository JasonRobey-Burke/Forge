import type { ProductContext } from '@shared/types';

export type ContextFieldStatus = 'inherited' | 'modified';

export interface ContextDiffResult {
  stack: ContextFieldStatus;
  patterns: ContextFieldStatus;
  conventions: ContextFieldStatus;
  auth: ContextFieldStatus;
  anyModified: boolean;
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((val, i) => val === b[i]);
}

export function compareContext(product: ProductContext, spec: ProductContext): ContextDiffResult {
  const stack = arraysEqual(product.stack, spec.stack) ? 'inherited' : 'modified';
  const patterns = arraysEqual(product.patterns, spec.patterns) ? 'inherited' : 'modified';
  const conventions = arraysEqual(product.conventions, spec.conventions) ? 'inherited' : 'modified';
  const auth = product.auth === spec.auth ? 'inherited' : 'modified';
  return {
    stack, patterns, conventions, auth,
    anyModified: stack === 'modified' || patterns === 'modified' || conventions === 'modified' || auth === 'modified',
  };
}
