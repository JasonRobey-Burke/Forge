import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../test/mocks/prisma.js';
import { mockSpec, TEST_SPEC_ID, TEST_PRODUCT_ID } from '../test/helpers.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

vi.mock('../../shared/checklist/evaluator.js', () => ({
  evaluateChecklist: vi.fn(),
}));

vi.mock('./spec.js', () => ({
  getSpec: vi.fn(),
  getSpecExpectations: vi.fn(),
}));

import { transitionSpec } from './phaseTransition.js';
import { evaluateChecklist } from '../../shared/checklist/evaluator.js';
import { getSpec, getSpecExpectations } from './spec.js';

const mockedEvaluateChecklist = vi.mocked(evaluateChecklist);
const mockedGetSpec = vi.mocked(getSpec);
const mockedGetSpecExpectations = vi.mocked(getSpecExpectations);

const TEST_USER_ID = 'user-001';

// A fully-passing serialized spec (already JSON-parsed, as getSpec returns)
const fullPassingSpec = {
  id: TEST_SPEC_ID,
  product_id: TEST_PRODUCT_ID,
  title: 'Test Spec',
  description: 'Test description',
  phase: 'Draft',
  complexity: 'Medium',
  context: { stack: ['React'], patterns: ['MVC'], conventions: ['ESLint'], auth: 'JWT' },
  boundaries: ['No external APIs'],
  deliverables: ['Component'],
  validation_automated: ['Unit tests'],
  validation_human: ['Code review'],
  peer_reviewed: true,
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-01T00:00:00.000Z',
  archived_at: null,
};

const passingChecklist = {
  items: [],
  passed: 11,
  total: 11,
  ready: true,
};

const failingChecklist = {
  items: [{ id: 'peer-reviewed', criterion: 'Spec has been peer-reviewed', passed: false, message: 'Mark this Spec as peer-reviewed.' }],
  passed: 10,
  total: 11,
  ready: false,
};

const mockExpectationsForChecklist = [
  { id: 'exp-1', title: 'Exp', description: 'Desc', status: 'Draft', edge_cases: ['Edge 1', 'Edge 2'] },
];

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.spec.update.mockResolvedValue(mockSpec({ phase: 'Ready' }));
  prismaMock.phaseTransition.create.mockResolvedValue({
    id: 'trans-001',
    spec_id: TEST_SPEC_ID,
    from_phase: 'Draft',
    to_phase: 'Ready',
    timestamp: new Date(),
    user_id: TEST_USER_ID,
    override_reason: null,
  });
});

describe('transitionSpec', () => {
  it('succeeds when all 11 checklist criteria pass (Draft → Ready)', async () => {
    mockedGetSpec.mockResolvedValue(fullPassingSpec as any);
    mockedGetSpecExpectations.mockResolvedValue(mockExpectationsForChecklist as any);
    mockedEvaluateChecklist.mockReturnValue(passingChecklist);

    const result = await transitionSpec(TEST_SPEC_ID, 'Ready', TEST_USER_ID);

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('returns CHECKLIST_INCOMPLETE when criteria fail (Draft → Ready)', async () => {
    mockedGetSpec.mockResolvedValue(fullPassingSpec as any);
    mockedGetSpecExpectations.mockResolvedValue(mockExpectationsForChecklist as any);
    mockedEvaluateChecklist.mockReturnValue(failingChecklist);

    const result = await transitionSpec(TEST_SPEC_ID, 'Ready', TEST_USER_ID);

    expect(result.success).toBe(false);
    expect(result.error).toBe('CHECKLIST_INCOMPLETE');
    expect(result.checklist).toEqual(failingChecklist);
  });

  it('succeeds even when criteria fail when override_reason is provided', async () => {
    mockedGetSpec.mockResolvedValue(fullPassingSpec as any);
    mockedEvaluateChecklist.mockReturnValue(failingChecklist);

    const result = await transitionSpec(TEST_SPEC_ID, 'Ready', TEST_USER_ID, 'Manager approved');

    expect(result.success).toBe(true);
    // evaluateChecklist should NOT be called when there is an override
    expect(mockedEvaluateChecklist).not.toHaveBeenCalled();
    // Verify override_reason is recorded in the PhaseTransition
    expect(prismaMock.phaseTransition.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ override_reason: 'Manager approved' }),
    });
  });

  it('succeeds without checklist for non-gated transitions (Ready → InProgress)', async () => {
    const readySpec = { ...fullPassingSpec, phase: 'Ready' };
    mockedGetSpec.mockResolvedValue(readySpec as any);

    const result = await transitionSpec(TEST_SPEC_ID, 'InProgress', TEST_USER_ID);

    expect(result.success).toBe(true);
    expect(mockedEvaluateChecklist).not.toHaveBeenCalled();
    expect(mockedGetSpecExpectations).not.toHaveBeenCalled();
  });

  it('returns not_found when spec does not exist', async () => {
    mockedGetSpec.mockResolvedValue(null);

    const result = await transitionSpec('nonexistent', 'Ready', TEST_USER_ID);

    expect(result.success).toBe(false);
    expect(result.error).toBe('not_found');
  });

  it('returns same_phase when transitioning to current phase', async () => {
    const draftSpec = { ...fullPassingSpec, phase: 'Draft' };
    mockedGetSpec.mockResolvedValue(draftSpec as any);

    const result = await transitionSpec(TEST_SPEC_ID, 'Draft', TEST_USER_ID);

    expect(result.success).toBe(false);
    expect(result.error).toBe('same_phase');
  });

  it('creates a PhaseTransition record on success', async () => {
    mockedGetSpec.mockResolvedValue(fullPassingSpec as any);
    mockedGetSpecExpectations.mockResolvedValue(mockExpectationsForChecklist as any);
    mockedEvaluateChecklist.mockReturnValue(passingChecklist);

    await transitionSpec(TEST_SPEC_ID, 'Ready', TEST_USER_ID);

    expect(prismaMock.phaseTransition.create).toHaveBeenCalledWith({
      data: {
        spec_id: TEST_SPEC_ID,
        from_phase: 'Draft',
        to_phase: 'Ready',
        user_id: TEST_USER_ID,
        override_reason: null,
      },
    });
  });

  it('does NOT create a PhaseTransition record on failure', async () => {
    mockedGetSpec.mockResolvedValue(fullPassingSpec as any);
    mockedGetSpecExpectations.mockResolvedValue(mockExpectationsForChecklist as any);
    mockedEvaluateChecklist.mockReturnValue(failingChecklist);

    await transitionSpec(TEST_SPEC_ID, 'Ready', TEST_USER_ID);

    expect(prismaMock.phaseTransition.create).not.toHaveBeenCalled();
    expect(prismaMock.spec.update).not.toHaveBeenCalled();
  });
});
