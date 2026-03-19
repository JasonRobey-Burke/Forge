import { describe, it, expect } from 'vitest';
import { estimateTokens } from './tokenEstimate';

describe('estimateTokens', () => {
  it('returns 0 for empty string', () => expect(estimateTokens('')).toBe(0));
  it('returns 0 for whitespace only', () => expect(estimateTokens('   ')).toBe(0));
  it('estimates word count * 1.3 rounded up', () => expect(estimateTokens('hello world')).toBe(3));
  it('handles multiline text', () => expect(estimateTokens('a\nb\nc')).toBe(4));
});
