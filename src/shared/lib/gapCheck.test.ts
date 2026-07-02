import { describe, it, expect } from 'vitest';
import { normalizeGapCheck, checkGapCheckGate, gapCheckBadge } from './gapCheck.js';

describe('normalizeGapCheck', () => {
  it('parses a canonical annotation', () => {
    const gc = normalizeGapCheck({
      status: 'passed', blockers: 0, warnings: 0, rounds: 2,
      report: 'docs/reviews/SPEC-a1b2-gap-check.md', date: '2026-06-10',
    });
    expect(gc).toEqual({
      status: 'passed', blockers: 0, warnings: 0, rounds: 2,
      report: 'docs/reviews/SPEC-a1b2-gap-check.md', date: '2026-06-10',
      warnings_acknowledged: undefined,
    });
  });

  it('is case-insensitive on the canonical enum values only', () => {
    expect(normalizeGapCheck({ status: 'PASSED', blockers: 0, warnings: 0 })?.status).toBe('passed');
    expect(normalizeGapCheck({ status: 'Blocked', blockers: 1, warnings: 0 })?.status).toBe('blocked');
    // retired vocabularies are not silently accepted
    expect(normalizeGapCheck({ status: 'pass', blockers: 0, warnings: 0 })).toBeNull();
    expect(normalizeGapCheck({ status: 'warned', blockers: 0, warnings: 1 })).toBeNull();
  });

  it('counts legacy finding-ID lists by length', () => {
    const gc = normalizeGapCheck({ status: 'blocked', blockers: ['GC-1', 'GC-2'], warnings: ['GC-3'] });
    expect(gc?.blockers).toBe(2);
    expect(gc?.warnings).toBe(1);
  });

  it('leaves rounds undefined when absent (unconfirmed, never assumed proven)', () => {
    const gc = normalizeGapCheck({ status: 'passed', blockers: 0, warnings: 0 });
    expect(gc?.rounds).toBeUndefined();
  });

  it('coerces YAML Date objects on the date field', () => {
    const gc = normalizeGapCheck({ status: 'passed', blockers: 0, warnings: 0, date: new Date('2026-06-10T00:00:00Z') });
    expect(gc?.date).toBe('2026-06-10');
  });

  it('returns null for absent or unusable values', () => {
    expect(normalizeGapCheck(undefined)).toBeNull();
    expect(normalizeGapCheck(null)).toBeNull();
    expect(normalizeGapCheck('passed')).toBeNull();
    expect(normalizeGapCheck([])).toBeNull();
    expect(normalizeGapCheck({})).toBeNull();
  });

  it('only records warnings_acknowledged when strictly true', () => {
    expect(normalizeGapCheck({ status: 'warnings', blockers: 0, warnings: 2, warnings_acknowledged: true })?.warnings_acknowledged).toBe(true);
    expect(normalizeGapCheck({ status: 'warnings', blockers: 0, warnings: 2, warnings_acknowledged: 'yes' })?.warnings_acknowledged).toBeUndefined();
  });
});

describe('checkGapCheckGate', () => {
  it('requires an annotation', () => {
    const result = checkGapCheckGate(null);
    expect(result.allowed).toBe(false);
    expect(result.code).toBe('GAP_CHECK_REQUIRED');
  });

  it('halts on blocked', () => {
    const result = checkGapCheckGate({ status: 'blocked', blockers: 3, warnings: 1 });
    expect(result.allowed).toBe(false);
    expect(result.code).toBe('GAP_CHECK_BLOCKED');
  });

  it('halts on unacknowledged warnings', () => {
    const result = checkGapCheckGate({ status: 'warnings', blockers: 0, warnings: 2 });
    expect(result.allowed).toBe(false);
    expect(result.code).toBe('GAP_CHECK_WARNINGS_UNACKNOWLEDGED');
  });

  it('allows acknowledged warnings', () => {
    expect(checkGapCheckGate({ status: 'warnings', blockers: 0, warnings: 2, warnings_acknowledged: true }).allowed).toBe(true);
  });

  it('allows passed', () => {
    expect(checkGapCheckGate({ status: 'passed', blockers: 0, warnings: 0, rounds: 2 }).allowed).toBe(true);
  });
});

describe('gapCheckBadge', () => {
  it('marks ungated specs', () => {
    expect(gapCheckBadge(undefined).tone).toBe('ungated');
  });

  it('summarizes each status', () => {
    expect(gapCheckBadge({ status: 'passed', blockers: 0, warnings: 0, rounds: 2 })).toMatchObject({ tone: 'passed', label: 'Gate ✓' });
    expect(gapCheckBadge({ status: 'blocked', blockers: 2, warnings: 3 })).toMatchObject({ tone: 'blocked', label: 'Blocked ×2' });
    expect(gapCheckBadge({ status: 'warnings', blockers: 0, warnings: 1 })).toMatchObject({ tone: 'warnings', label: 'Warnings ×1' });
    expect(gapCheckBadge({ status: 'warnings', blockers: 0, warnings: 1, warnings_acknowledged: true }).label).toContain('✓');
  });

  it('notes unrecorded rounds instead of assuming a value', () => {
    expect(gapCheckBadge({ status: 'passed', blockers: 0, warnings: 0 }).detail).toContain('rounds unrecorded');
  });
});
