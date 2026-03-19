import { test, expect } from '@playwright/test';
import { createProduct, createIntention, deleteEntity } from './helpers';

test.describe('Circular Dependency Detection', () => {
  let productId: string;

  test.beforeAll(async () => {
    const product = await createProduct({ name: 'E2E Circular Dep Test' });
    productId = product.id;
  });

  test.afterAll(async () => {
    await deleteEntity('products', productId);
  });

  test('allows valid dependency A→B', async () => {
    const intentionA = await createIntention(productId, { title: 'Intention A' });
    const intentionB = await createIntention(productId, { title: 'Intention B' });

    // Add A depends on B via API
    const res = await fetch(`http://localhost:3001/api/intentions/${intentionA.id}/dependencies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ depends_on_id: intentionB.id }),
    });
    const json = await res.json();
    expect(json.error).toBeNull();
  });

  test('rejects circular dependency B→A when A→B exists', async () => {
    const intentionA = await createIntention(productId, { title: 'Circ A' });
    const intentionB = await createIntention(productId, { title: 'Circ B' });

    // Add A→B
    await fetch(`http://localhost:3001/api/intentions/${intentionA.id}/dependencies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ depends_on_id: intentionB.id }),
    });

    // Try B→A — should fail
    const res = await fetch(`http://localhost:3001/api/intentions/${intentionB.id}/dependencies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ depends_on_id: intentionA.id }),
    });
    const json = await res.json();
    expect(json.error).not.toBeNull();
    expect(json.error.message).toContain('circular');
  });
});
