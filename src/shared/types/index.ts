export * from './enums.js';
export * from './product.js';
export * from './intention.js';
export * from './expectation.js';
export * from './spec.js';

export interface ApiResponse<T> {
  data: T | null;
  error: { message: string; code: string; details?: unknown } | null;
  meta: Record<string, unknown> | null;
}
