import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../test/mocks/prisma.js';
import { mockProduct, mockIntention, TEST_PRODUCT_ID, TEST_INTENTION_ID } from '../test/helpers.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import * as intentionService from './intention.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('listIntentions', () => {
  it('returns serialized intentions filtered by product_id', async () => {
    const row = mockIntention();
    prismaMock.intention.findMany.mockResolvedValue([row]);

    const result = await intentionService.listIntentions(TEST_PRODUCT_ID);

    expect(prismaMock.intention.findMany).toHaveBeenCalledWith({
      where: { product_id: TEST_PRODUCT_ID, archived_at: null },
      orderBy: { created_at: 'desc' },
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(TEST_INTENTION_ID);
    expect(result[0].created_at).toBe('2025-01-01T00:00:00.000Z');
  });
});

describe('getIntention', () => {
  it('returns null when not found', async () => {
    prismaMock.intention.findFirst.mockResolvedValue(null);
    const result = await intentionService.getIntention('nonexistent');
    expect(result).toBeNull();
  });

  it('returns serialized intention with dependencies', async () => {
    const row = {
      ...mockIntention(),
      dependencies_as_source: [
        { depends_on: { id: 'dep-id', title: 'Dep Title' } },
      ],
    };
    prismaMock.intention.findFirst.mockResolvedValue(row);

    const result = await intentionService.getIntention(TEST_INTENTION_ID);

    expect(result).not.toBeNull();
    expect(result!.dependencies).toHaveLength(1);
    expect(result!.dependencies![0].title).toBe('Dep Title');
  });
});

describe('createIntention', () => {
  it('creates intention with defaults when parent product exists', async () => {
    prismaMock.product.findFirst.mockResolvedValue(mockProduct());
    prismaMock.intention.create.mockResolvedValue(mockIntention());

    const result = await intentionService.createIntention({
      product_id: TEST_PRODUCT_ID,
      title: 'Test Intention',
      description: 'Test description',
    });

    expect(prismaMock.intention.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        priority: 'Medium',
        status: 'Draft',
      }),
    });
    expect(result).not.toBeNull();
    expect(result!.title).toBe('Test Intention');
  });

  it('returns null when parent product not found', async () => {
    prismaMock.product.findFirst.mockResolvedValue(null);

    const result = await intentionService.createIntention({
      product_id: TEST_PRODUCT_ID,
      title: 'Test',
      description: 'Test',
    });

    expect(result).toBeNull();
    expect(prismaMock.intention.create).not.toHaveBeenCalled();
  });
});

describe('updateIntention', () => {
  it('returns null when not found', async () => {
    prismaMock.intention.findFirst.mockResolvedValue(null);
    const result = await intentionService.updateIntention('nonexistent', { title: 'Updated' });
    expect(result).toBeNull();
  });

  it('partial updates only provided fields', async () => {
    prismaMock.intention.findFirst.mockResolvedValue(mockIntention());
    prismaMock.intention.update.mockResolvedValue(mockIntention({ title: 'Updated' }));

    await intentionService.updateIntention(TEST_INTENTION_ID, { title: 'Updated' });

    expect(prismaMock.intention.update).toHaveBeenCalledWith({
      where: { id: TEST_INTENTION_ID },
      data: { title: 'Updated' },
    });
  });
});

describe('deleteIntention', () => {
  it('returns not_found when not found', async () => {
    prismaMock.intention.findFirst.mockResolvedValue(null);
    const result = await intentionService.deleteIntention('nonexistent');
    expect(result).toEqual({ success: false, error: 'not_found' });
  });

  it('blocks deletion when active child expectations exist', async () => {
    prismaMock.intention.findFirst.mockResolvedValue(mockIntention());
    prismaMock.expectation.count.mockResolvedValue(3);

    const result = await intentionService.deleteIntention(TEST_INTENTION_ID);
    expect(result).toEqual({ success: false, error: 'has_children' });
  });

  it('soft-deletes when no children', async () => {
    prismaMock.intention.findFirst.mockResolvedValue(mockIntention());
    prismaMock.expectation.count.mockResolvedValue(0);
    prismaMock.intention.update.mockResolvedValue(mockIntention());

    const result = await intentionService.deleteIntention(TEST_INTENTION_ID);
    expect(result).toEqual({ success: true });
    expect(prismaMock.intention.update).toHaveBeenCalledWith({
      where: { id: TEST_INTENTION_ID },
      data: { archived_at: expect.any(Date) },
    });
  });
});
