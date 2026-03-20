import { describe, it, expect } from 'vitest';
import { getWipKeyForPhase, checkWipLimit } from './wipCheck.js';

describe('getWipKeyForPhase', () => {
  it('maps Draft to draft', () => expect(getWipKeyForPhase('Draft')).toBe('draft'));
  it('maps Ready to ready', () => expect(getWipKeyForPhase('Ready')).toBe('ready'));
  it('maps InProgress to in_progress', () => expect(getWipKeyForPhase('InProgress')).toBe('in_progress'));
  it('maps Review to review', () => expect(getWipKeyForPhase('Review')).toBe('review'));
  it('maps Validating to validating', () => expect(getWipKeyForPhase('Validating')).toBe('validating'));
  it('returns null for Done', () => expect(getWipKeyForPhase('Done')).toBeNull());
  it('returns null for unknown phase', () => expect(getWipKeyForPhase('Unknown')).toBeNull());
});

describe('checkWipLimit', () => {
  const limits = { draft: 5, ready: 3, in_progress: 3, review: 3, validating: 2 };

  it('allows when under limit', () => {
    const result = checkWipLimit('Ready', 2, limits);
    expect(result.allowed).toBe(true);
    expect(result.currentCount).toBe(2);
    expect(result.limit).toBe(3);
  });

  it('blocks when at limit', () => {
    expect(checkWipLimit('Ready', 3, limits).allowed).toBe(false);
  });

  it('blocks when over limit', () => {
    expect(checkWipLimit('Ready', 5, limits).allowed).toBe(false);
  });

  it('allows when limit is 0 (unlimited)', () => {
    const unlimitedLimits = { ...limits, ready: 0 };
    expect(checkWipLimit('Ready', 100, unlimitedLimits).allowed).toBe(true);
  });

  it('always allows Done phase', () => {
    expect(checkWipLimit('Done', 999, limits).allowed).toBe(true);
  });
});
