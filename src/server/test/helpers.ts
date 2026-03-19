// Valid RFC 4122 v4 UUIDs (variant bits at position 19 must be 8/9/a/b)
export const TEST_PRODUCT_ID = 'a0000000-0000-4000-a000-000000000001';
export const TEST_INTENTION_ID = 'b0000000-0000-4000-a000-000000000001';
export const TEST_EXPECTATION_ID = 'c0000000-0000-4000-a000-000000000001';
export const TEST_SPEC_ID = 'd0000000-0000-4000-a000-000000000001';

export function mockProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_PRODUCT_ID,
    name: 'Test Product',
    problem_statement: 'Test problem',
    vision: 'Test vision',
    target_audience: 'Test audience',
    status: 'Active',
    context: JSON.stringify({ stack: [], patterns: [], conventions: [], auth: '' }),
    wip_limits: JSON.stringify({ draft: 5, ready: 3, in_progress: 3, review: 3, validating: 2 }),
    created_at: new Date('2025-01-01T00:00:00Z'),
    updated_at: new Date('2025-01-01T00:00:00Z'),
    archived_at: null,
    ...overrides,
  };
}

export function mockIntention(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_INTENTION_ID,
    product_id: TEST_PRODUCT_ID,
    title: 'Test Intention',
    description: 'Test description',
    priority: 'Medium',
    status: 'Draft',
    created_at: new Date('2025-01-01T00:00:00Z'),
    updated_at: new Date('2025-01-01T00:00:00Z'),
    archived_at: null,
    ...overrides,
  };
}

export function mockExpectation(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_EXPECTATION_ID,
    intention_id: TEST_INTENTION_ID,
    title: 'Test Expectation',
    description: 'Test description',
    status: 'Draft',
    edge_cases: JSON.stringify(['Edge case 1', 'Edge case 2']),
    created_at: new Date('2025-01-01T00:00:00Z'),
    updated_at: new Date('2025-01-01T00:00:00Z'),
    archived_at: null,
    ...overrides,
  };
}

export function mockSpec(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_SPEC_ID,
    product_id: TEST_PRODUCT_ID,
    title: 'Test Spec',
    description: 'Test description',
    phase: 'Draft',
    complexity: 'Medium',
    context: JSON.stringify({ stack: [], patterns: [], conventions: [], auth: '' }),
    boundaries: JSON.stringify([]),
    deliverables: JSON.stringify([]),
    validation_automated: JSON.stringify([]),
    validation_human: JSON.stringify([]),
    peer_reviewed: false,
    created_at: new Date('2025-01-01T00:00:00Z'),
    updated_at: new Date('2025-01-01T00:00:00Z'),
    archived_at: null,
    ...overrides,
  };
}
