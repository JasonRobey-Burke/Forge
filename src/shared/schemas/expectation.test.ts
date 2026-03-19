import { describe, it, expect } from 'vitest';
import { createExpectationSchema, updateExpectationSchema } from './expectation.js';

const INTENTION_UUID = 'b0000000-0000-4000-a000-000000000001';

describe('createExpectationSchema', () => {
  it('accepts valid input', () => {
    const result = createExpectationSchema.safeParse({
      intention_id: INTENTION_UUID,
      title: 'Test Expectation',
      description: 'A test expectation',
      edge_cases: ['Edge case 1', 'Edge case 2'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects edge_cases with fewer than 2 items', () => {
    const result = createExpectationSchema.safeParse({
      intention_id: INTENTION_UUID,
      title: 'Test',
      description: 'Test',
      edge_cases: ['Only one'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty title', () => {
    const result = createExpectationSchema.safeParse({
      intention_id: INTENTION_UUID,
      title: '',
      description: 'Test',
      edge_cases: ['A', 'B'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing edge_cases', () => {
    const result = createExpectationSchema.safeParse({
      intention_id: INTENTION_UUID,
      title: 'Test',
      description: 'Test',
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional status', () => {
    const result = createExpectationSchema.safeParse({
      intention_id: INTENTION_UUID,
      title: 'Test',
      description: 'Test',
      edge_cases: ['A', 'B'],
      status: 'Ready',
    });
    expect(result.success).toBe(true);
  });
});

describe('updateExpectationSchema', () => {
  it('accepts all fields optional', () => {
    const result = updateExpectationSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects edge_cases with fewer than 2 when provided', () => {
    const result = updateExpectationSchema.safeParse({
      edge_cases: ['Only one'],
    });
    expect(result.success).toBe(false);
  });

  it('accepts edge_cases with 2+ items', () => {
    const result = updateExpectationSchema.safeParse({
      edge_cases: ['A', 'B', 'C'],
    });
    expect(result.success).toBe(true);
  });
});
