import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../test/mocks/prisma.js';
import { mockIntention, mockExpectation, TEST_INTENTION_ID, TEST_EXPECTATION_ID } from '../test/helpers.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import * as expectationService from './expectation.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('listExpectations', () => {
  it('returns serialized expectations filtered by intention_id', async () => {
    const row = mockExpectation();
    prismaMock.expectation.findMany.mockResolvedValue([row]);

    const result = await expectationService.listExpectations(TEST_INTENTION_ID);

    expect(prismaMock.expectation.findMany).toHaveBeenCalledWith({
      where: { intention_id: TEST_INTENTION_ID, archived_at: null },
      orderBy: { created_at: 'desc' },
    });
    expect(result).toHaveLength(1);
    expect(result[0].edge_cases).toEqual(['Edge case 1', 'Edge case 2']);
  });
});

describe('getExpectation', () => {
  it('returns null when not found', async () => {
    prismaMock.expectation.findFirst.mockResolvedValue(null);
    const result = await expectationService.getExpectation('nonexistent');
    expect(result).toBeNull();
  });

  it('deserializes edge_cases JSON', async () => {
    prismaMock.expectation.findFirst.mockResolvedValue(mockExpectation());
    const result = await expectationService.getExpectation(TEST_EXPECTATION_ID);
    expect(result!.edge_cases).toEqual(['Edge case 1', 'Edge case 2']);
  });
});

describe('createExpectation', () => {
  it('creates when parent intention exists', async () => {
    prismaMock.intention.findFirst.mockResolvedValue(mockIntention());
    prismaMock.expectation.create.mockResolvedValue(mockExpectation());

    const result = await expectationService.createExpectation({
      intention_id: TEST_INTENTION_ID,
      title: 'Test Expectation',
      description: 'Test',
      edge_cases: ['A', 'B'],
    });

    expect(prismaMock.expectation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        edge_cases: JSON.stringify(['A', 'B']),
        status: 'Draft',
      }),
    });
    expect(result).not.toBeNull();
  });

  it('returns null when parent intention not found', async () => {
    prismaMock.intention.findFirst.mockResolvedValue(null);
    const result = await expectationService.createExpectation({
      intention_id: TEST_INTENTION_ID,
      title: 'Test',
      description: 'Test',
      edge_cases: ['A', 'B'],
    });
    expect(result).toBeNull();
  });
});

describe('updateExpectation', () => {
  it('returns null when not found', async () => {
    prismaMock.expectation.findFirst.mockResolvedValue(null);
    const result = await expectationService.updateExpectation('nonexistent', { title: 'Updated' });
    expect(result).toBeNull();
  });

  it('serializes edge_cases when provided', async () => {
    prismaMock.expectation.findFirst.mockResolvedValue(mockExpectation());
    prismaMock.expectation.update.mockResolvedValue(mockExpectation());

    await expectationService.updateExpectation(TEST_EXPECTATION_ID, {
      edge_cases: ['New A', 'New B'],
    });

    expect(prismaMock.expectation.update).toHaveBeenCalledWith({
      where: { id: TEST_EXPECTATION_ID },
      data: { edge_cases: JSON.stringify(['New A', 'New B']) },
    });
  });
});

describe('deleteExpectation', () => {
  it('returns false when not found', async () => {
    prismaMock.expectation.findFirst.mockResolvedValue(null);
    expect(await expectationService.deleteExpectation('nonexistent')).toBe(false);
  });

  it('soft-deletes', async () => {
    prismaMock.expectation.findFirst.mockResolvedValue(mockExpectation());
    prismaMock.expectation.update.mockResolvedValue(mockExpectation());

    expect(await expectationService.deleteExpectation(TEST_EXPECTATION_ID)).toBe(true);
    expect(prismaMock.expectation.update).toHaveBeenCalledWith({
      where: { id: TEST_EXPECTATION_ID },
      data: { archived_at: expect.any(Date) },
    });
  });
});
