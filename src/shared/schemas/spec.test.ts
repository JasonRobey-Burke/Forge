import { describe, it, expect } from 'vitest';
import { createSpecSchema, updateSpecSchema } from './spec.js';

const PRODUCT_UUID = 'a0000000-0000-4000-a000-000000000001';
const EXPECTATION_UUID = 'c0000000-0000-4000-a000-000000000001';

describe('createSpecSchema', () => {
  it('accepts valid minimal input', () => {
    const result = createSpecSchema.safeParse({
      product_id: PRODUCT_UUID,
      title: 'Test Spec',
      description: 'A test spec',
    });
    expect(result.success).toBe(true);
  });

  it('accepts all optional fields', () => {
    const result = createSpecSchema.safeParse({
      product_id: PRODUCT_UUID,
      title: 'Test Spec',
      description: 'A test spec',
      phase: 'Draft',
      complexity: 'High',
      context: { stack: ['React'], patterns: [], conventions: [], auth: 'JWT' },
      boundaries: ['No external APIs'],
      deliverables: ['Component'],
      validation_automated: ['Unit tests'],
      validation_human: ['Code review'],
      expectation_ids: [EXPECTATION_UUID],
    });
    expect(result.success).toBe(true);
  });

  it('validates context shape', () => {
    const result = createSpecSchema.safeParse({
      product_id: PRODUCT_UUID,
      title: 'Test',
      description: 'Test',
      context: { invalid: 'shape' },
    });
    expect(result.success).toBe(false);
  });

  it('accepts non-UUID expectation_ids', () => {
    const result = createSpecSchema.safeParse({
      product_id: PRODUCT_UUID,
      title: 'Test',
      description: 'Test',
      expectation_ids: ['not-a-uuid'],
    });
    expect(result.success).toBe(true);
  });

  it('accepts arbitrary phase values', () => {
    const result = createSpecSchema.safeParse({
      product_id: PRODUCT_UUID,
      title: 'Test',
      description: 'Test',
      phase: 'Invalid',
    });
    expect(result.success).toBe(true);
  });
});

describe('updateSpecSchema', () => {
  it('accepts all fields optional', () => {
    const result = updateSpecSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts peer_reviewed boolean', () => {
    const result = updateSpecSchema.safeParse({ peer_reviewed: true });
    expect(result.success).toBe(true);
  });

  it('accepts arbitrary complexity values', () => {
    const result = updateSpecSchema.safeParse({ complexity: 'Invalid' });
    expect(result.success).toBe(true);
  });
});
