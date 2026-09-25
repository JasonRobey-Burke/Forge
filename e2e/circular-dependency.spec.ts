import { test, expect } from './workspace-fixtures';
import { createProduct, createIntention, resetLegacyDocs, revision } from './helpers';
test.beforeEach(async () => resetLegacyDocs());
for (const circular of [false, true]) {
  test(circular ? 'rejects circular dependency B to A when A to B exists' : 'allows valid dependency A to B', async ({ request }) => {
    const product = await createProduct();
    const a = await createIntention(product.id, { statement: 'Intention A' });
    const b = await createIntention(product.id, { statement: 'Intention B' });
    const first = await request.post(`/api/intentions/${a.id}/dependencies`, { headers: { 'If-Match': await revision('intentions', a.id) }, data: { depends_on_id: b.id } });
    expect(first.ok()).toBe(true);
    expect((await first.json()).error).toBeNull();
    if (circular) {
      const response = await request.post(`/api/intentions/${b.id}/dependencies`, { headers: { 'If-Match': await revision('intentions', b.id) }, data: { depends_on_id: a.id } });
      expect(response.ok()).toBe(false);
      expect((await response.json()).error.message).toMatch(/circular/i);
    }
  });
}
