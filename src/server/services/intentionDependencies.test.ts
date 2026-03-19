import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../test/mocks/prisma.js';
import { mockIntention, TEST_INTENTION_ID } from '../test/helpers.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import { detectCircularDependency, addDependency, removeDependency } from './intentionDependencies.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('detectCircularDependency (pure)', () => {
  it('A→B (no cycle) returns false', () => {
    const result = detectCircularDependency('A', 'B', []);
    expect(result).toBe(false);
  });

  it('A→A (self-reference) returns true', () => {
    const result = detectCircularDependency('A', 'A', []);
    expect(result).toBe(true);
  });

  it('A→B then B→A returns true', () => {
    const edges = [{ intention_id: 'A', depends_on_id: 'B' }];
    const result = detectCircularDependency('B', 'A', edges);
    expect(result).toBe(true);
  });

  it('A→B→C then C→A returns true', () => {
    const edges = [
      { intention_id: 'A', depends_on_id: 'B' },
      { intention_id: 'B', depends_on_id: 'C' },
    ];
    const result = detectCircularDependency('C', 'A', edges);
    expect(result).toBe(true);
  });

  it('diamond (no cycle) returns false', () => {
    // A→B, A→C, B→C — adding D→A is not a cycle
    const edges = [
      { intention_id: 'A', depends_on_id: 'B' },
      { intention_id: 'A', depends_on_id: 'C' },
      { intention_id: 'B', depends_on_id: 'C' },
    ];
    const result = detectCircularDependency('D', 'A', edges);
    expect(result).toBe(false);
  });
});

describe('addDependency', () => {
  it('rejects self-reference', async () => {
    const result = await addDependency('A', 'A');
    expect(result).toEqual({ success: false, error: 'Self-reference is not allowed' });
  });

  it('creates dependency when no cycle', async () => {
    prismaMock.intention.findFirst.mockResolvedValue(mockIntention());
    prismaMock.intention.findMany.mockResolvedValue([{ id: TEST_INTENTION_ID }, { id: 'dep-id' }]);
    prismaMock.intentionDependency.findMany.mockResolvedValue([]);
    prismaMock.intentionDependency.create.mockResolvedValue({});

    const result = await addDependency(TEST_INTENTION_ID, 'dep-id');
    expect(result).toEqual({ success: true });
    expect(prismaMock.intentionDependency.create).toHaveBeenCalled();
  });

  it('rejects when cycle detected', async () => {
    prismaMock.intention.findFirst.mockResolvedValue(mockIntention({ id: 'B' }));
    prismaMock.intention.findMany.mockResolvedValue([{ id: 'A' }, { id: 'B' }]);
    prismaMock.intentionDependency.findMany.mockResolvedValue([
      { intention_id: 'A', depends_on_id: 'B' },
    ]);

    const result = await addDependency('B', 'A');
    expect(result.success).toBe(false);
    expect(result.error).toContain('circular');
  });
});

describe('removeDependency', () => {
  it('returns true on successful deletion', async () => {
    prismaMock.intentionDependency.delete.mockResolvedValue({});
    const result = await removeDependency('A', 'B');
    expect(result).toBe(true);
  });

  it('returns false when not found', async () => {
    prismaMock.intentionDependency.delete.mockRejectedValue(new Error('Not found'));
    const result = await removeDependency('A', 'B');
    expect(result).toBe(false);
  });
});
