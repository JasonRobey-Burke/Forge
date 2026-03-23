import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../test/mocks/prisma.js';
import { mockProduct, mockSpec, TEST_PRODUCT_ID, TEST_SPEC_ID, TEST_EXPECTATION_ID } from '../test/helpers.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import * as specService from './spec.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('listSpecs', () => {
  it('returns serialized specs filtered by product_id', async () => {
    prismaMock.spec.findMany.mockResolvedValue([mockSpec()]);
    const result = await specService.listSpecs(TEST_PRODUCT_ID);
    expect(prismaMock.spec.findMany).toHaveBeenCalledWith({
      where: { product_id: TEST_PRODUCT_ID, archived_at: null },
      orderBy: { created_at: 'desc' },
    });
    expect(result).toHaveLength(1);
    expect(result[0].context).toEqual({ stack: [], patterns: [], conventions: [], auth: '' });
  });
});

describe('getSpec', () => {
  it('returns null when not found', async () => {
    prismaMock.spec.findFirst.mockResolvedValue(null);
    expect(await specService.getSpec('nonexistent')).toBeNull();
  });

  it('JSON.parse all 5 JSON columns', async () => {
    const row = mockSpec({
      boundaries: JSON.stringify(['No external APIs']),
      deliverables: JSON.stringify(['Component']),
      validation_automated: JSON.stringify(['Unit test']),
      validation_human: JSON.stringify(['Review']),
    });
    prismaMock.spec.findFirst.mockResolvedValue(row);
    const result = await specService.getSpec(TEST_SPEC_ID);
    expect(result!.boundaries).toEqual(['No external APIs']);
    expect(result!.deliverables).toEqual(['Component']);
    expect(result!.validation_automated).toEqual(['Unit test']);
    expect(result!.validation_human).toEqual(['Review']);
  });
});

describe('createSpec', () => {
  it('inherits product context when none provided', async () => {
    const productCtx = JSON.stringify({ stack: ['React'], patterns: [], conventions: [], auth: 'JWT' });
    prismaMock.product.findFirst.mockResolvedValue(mockProduct({ context: productCtx }));
    prismaMock.spec.create.mockResolvedValue(mockSpec({ context: productCtx }));

    const result = await specService.createSpec({
      product_id: TEST_PRODUCT_ID,
      title: 'Test Spec',
      description: 'Test',
    });

    expect(prismaMock.spec.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ context: productCtx }),
    });
    expect(result).not.toBeNull();
  });

  it('uses provided context over product context', async () => {
    prismaMock.product.findFirst.mockResolvedValue(mockProduct());
    const customCtx = { stack: ['Vue'], patterns: [], conventions: [], auth: '' };
    prismaMock.spec.create.mockResolvedValue(mockSpec({ context: JSON.stringify(customCtx) }));

    await specService.createSpec({
      product_id: TEST_PRODUCT_ID,
      title: 'Test',
      description: 'Test',
      context: customCtx,
    });

    expect(prismaMock.spec.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ context: JSON.stringify(customCtx) }),
    });
  });

  it('creates SpecExpectation rows when expectation_ids provided', async () => {
    prismaMock.product.findFirst.mockResolvedValue(mockProduct());
    prismaMock.spec.create.mockResolvedValue(mockSpec());
    prismaMock.specExpectation.createMany.mockResolvedValue({ count: 1 });

    await specService.createSpec({
      product_id: TEST_PRODUCT_ID,
      title: 'Test',
      description: 'Test',
      expectation_ids: [TEST_EXPECTATION_ID],
    });

    expect(prismaMock.specExpectation.createMany).toHaveBeenCalledWith({
      data: [{ spec_id: TEST_SPEC_ID, expectation_id: TEST_EXPECTATION_ID }],
    });
  });

  it('returns null when product not found', async () => {
    prismaMock.product.findFirst.mockResolvedValue(null);
    expect(await specService.createSpec({
      product_id: TEST_PRODUCT_ID,
      title: 'Test',
      description: 'Test',
    })).toBeNull();
  });
});

describe('updateSpec', () => {
  it('returns null when not found', async () => {
    prismaMock.spec.findFirst.mockResolvedValue(null);
    expect(await specService.updateSpec('nonexistent', { title: 'Updated' })).toBeNull();
  });

  it('JSON.stringify array fields on update', async () => {
    prismaMock.spec.findFirst.mockResolvedValue(mockSpec());
    prismaMock.spec.update.mockResolvedValue(mockSpec());

    await specService.updateSpec(TEST_SPEC_ID, { boundaries: ['New boundary'] });

    expect(prismaMock.spec.update).toHaveBeenCalledWith({
      where: { id: TEST_SPEC_ID },
      data: { boundaries: JSON.stringify(['New boundary']) },
    });
  });
});

describe('deleteSpec', () => {
  it('returns false when not found', async () => {
    prismaMock.spec.findFirst.mockResolvedValue(null);
    expect(await specService.deleteSpec('nonexistent')).toBe(false);
  });

  it('soft-deletes', async () => {
    prismaMock.spec.findFirst.mockResolvedValue(mockSpec());
    prismaMock.spec.update.mockResolvedValue(mockSpec());
    expect(await specService.deleteSpec(TEST_SPEC_ID)).toBe(true);
  });
});

describe('linkExpectations', () => {
  it('replaces spec expectations in transaction', async () => {
    prismaMock.spec.findFirst.mockResolvedValue(mockSpec());
    prismaMock.specExpectation.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.specExpectation.createMany.mockResolvedValue({ count: 1 });

    const result = await specService.linkExpectations(TEST_SPEC_ID, [TEST_EXPECTATION_ID]);
    expect(result).toBe(true);
    expect(prismaMock.specExpectation.deleteMany).toHaveBeenCalledWith({
      where: { spec_id: TEST_SPEC_ID },
    });
    expect(prismaMock.specExpectation.createMany).toHaveBeenCalled();
  });

  it('returns false when spec not found', async () => {
    prismaMock.spec.findFirst.mockResolvedValue(null);
    expect(await specService.linkExpectations('nonexistent', [])).toBe(false);
  });
});

describe('getSpecExpectations', () => {
  it('returns linked expectations', async () => {
    prismaMock.specExpectation.findMany.mockResolvedValue([
      {
        spec_id: TEST_SPEC_ID,
        expectation_id: TEST_EXPECTATION_ID,
        expectation: { id: TEST_EXPECTATION_ID, title: 'Exp', description: 'Desc', status: 'Draft', edge_cases: '["Edge 1","Edge 2"]' },
      },
    ]);

    const result = await specService.getSpecExpectations(TEST_SPEC_ID);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Exp');
    expect(result[0].edge_cases).toEqual(['Edge 1', 'Edge 2']);
  });
});

describe('checkSpecStaleness', () => {
  const GATE_TIME = new Date('2025-03-01T00:00:00Z');
  const BEFORE_GATE = new Date('2025-02-28T00:00:00Z');
  const AFTER_GATE = new Date('2025-03-02T00:00:00Z');

  it('returns stale: false for Draft specs', async () => {
    prismaMock.spec.findFirst.mockResolvedValue(mockSpec({ phase: 'Draft' }));
    const result = await specService.checkSpecStaleness(TEST_SPEC_ID);
    expect(result).toEqual({ stale: false, staleExpectationIds: [] });
    expect(prismaMock.phaseTransition.findFirst).not.toHaveBeenCalled();
  });

  it('returns stale: false when no Draft→Ready transition exists', async () => {
    prismaMock.spec.findFirst.mockResolvedValue(mockSpec({ phase: 'Ready' }));
    prismaMock.phaseTransition.findFirst.mockResolvedValue(null);
    const result = await specService.checkSpecStaleness(TEST_SPEC_ID);
    expect(result).toEqual({ stale: false, staleExpectationIds: [] });
  });

  it('returns stale: false when no expectations modified after gate', async () => {
    prismaMock.spec.findFirst.mockResolvedValue(mockSpec({ phase: 'InProgress' }));
    prismaMock.phaseTransition.findFirst.mockResolvedValue({
      id: 'pt-1',
      spec_id: TEST_SPEC_ID,
      from_phase: 'Draft',
      to_phase: 'Ready',
      timestamp: GATE_TIME,
    });
    prismaMock.specExpectation.findMany.mockResolvedValue([
      {
        spec_id: TEST_SPEC_ID,
        expectation_id: TEST_EXPECTATION_ID,
        expectation: { id: TEST_EXPECTATION_ID, updated_at: BEFORE_GATE },
      },
    ]);
    const result = await specService.checkSpecStaleness(TEST_SPEC_ID);
    expect(result).toEqual({ stale: false, staleExpectationIds: [] });
  });

  it('returns stale: true with IDs when expectations modified after gate', async () => {
    const STALE_EXP_ID = 'e0000000-0000-4000-a000-000000000002';
    prismaMock.spec.findFirst.mockResolvedValue(mockSpec({ phase: 'Review' }));
    prismaMock.phaseTransition.findFirst.mockResolvedValue({
      id: 'pt-1',
      spec_id: TEST_SPEC_ID,
      from_phase: 'Draft',
      to_phase: 'Ready',
      timestamp: GATE_TIME,
    });
    prismaMock.specExpectation.findMany.mockResolvedValue([
      {
        spec_id: TEST_SPEC_ID,
        expectation_id: TEST_EXPECTATION_ID,
        expectation: { id: TEST_EXPECTATION_ID, updated_at: BEFORE_GATE },
      },
      {
        spec_id: TEST_SPEC_ID,
        expectation_id: STALE_EXP_ID,
        expectation: { id: STALE_EXP_ID, updated_at: AFTER_GATE },
      },
    ]);
    const result = await specService.checkSpecStaleness(TEST_SPEC_ID);
    expect(result).toEqual({ stale: true, staleExpectationIds: [STALE_EXP_ID] });
  });
});
