import { describe, it, expect } from 'vitest';
import { daysInPhase } from './SpecCard';

describe('daysInPhase', () => {
  it('returns 0 for today', () => {
    expect(daysInPhase(new Date().toISOString())).toBe(0);
  });

  it('returns 1 for yesterday', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    expect(daysInPhase(yesterday)).toBe(1);
  });

  it('returns 30 for 30 days ago', () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    expect(daysInPhase(thirtyDaysAgo)).toBe(30);
  });
});
