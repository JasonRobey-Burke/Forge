import { describe, it, expect } from 'vitest';
import { createIntentionSchema, updateIntentionSchema } from './intention.js';

// Valid RFC 4122 UUIDs for testing (variant bits correct at position 19)
const PRODUCT_UUID = 'a0000000-0000-4000-a000-000000000001';

describe('createIntentionSchema', () => {
  it('accepts valid input', () => {
    const result = createIntentionSchema.safeParse({
      product_id: PRODUCT_UUID,
      title: 'Test Intention',
      description: 'A test intention description',
    });
    expect(result.success).toBe(true);
  });

  it('accepts all optional fields', () => {
    const result = createIntentionSchema.safeParse({
      product_id: PRODUCT_UUID,
      title: 'Test Intention',
      description: 'A test intention',
      priority: 'High',
      status: 'Defined',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing product_id', () => {
    const result = createIntentionSchema.safeParse({
      title: 'Test',
      description: 'Test',
    });
    expect(result.success).toBe(false);
  });

  it('accepts non-UUID product_id', () => {
    const result = createIntentionSchema.safeParse({
      product_id: 'not-a-uuid',
      title: 'Test',
      description: 'Test',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty title', () => {
    const result = createIntentionSchema.safeParse({
      product_id: PRODUCT_UUID,
      title: '',
      description: 'Test',
    });
    expect(result.success).toBe(false);
  });

  it('accepts arbitrary priority values', () => {
    const result = createIntentionSchema.safeParse({
      product_id: PRODUCT_UUID,
      title: 'Test',
      description: 'Test',
      priority: 'Invalid',
    });
    expect(result.success).toBe(true);
  });
});

describe('updateIntentionSchema', () => {
  it('accepts all fields optional', () => {
    const result = updateIntentionSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts partial update', () => {
    const result = updateIntentionSchema.safeParse({ title: 'Updated' });
    expect(result.success).toBe(true);
  });

  it('accepts arbitrary status values', () => {
    const result = updateIntentionSchema.safeParse({ status: 'Invalid' });
    expect(result.success).toBe(true);
  });
});
