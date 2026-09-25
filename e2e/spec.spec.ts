import { test, expect } from './workspace-fixtures';
import { createProduct, createSpec, resetLegacyDocs } from './helpers';
test.beforeEach(async () => resetLegacyDocs());
test('Delivery navigation retains access to existing specs', async ({ page }) => {
  const product = await createProduct(); const spec = await createSpec(product.id, { title: 'Existing delivery' });
  await page.goto(`/products/${product.id}`);
  await page.getByRole('link', { name: 'Delivery', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/products/${product.id}/board$`));
  await expect(page.getByRole('button', { name: 'Existing delivery', exact: true })).toBeVisible();
});
test('product and spec creation controls are absent', async ({ page }) => {
  const product = await createProduct();
  await page.goto('/products');
  await expect(page.getByRole('button', { name: /new product|create product/i }).or(page.getByRole('link', { name: /new product|create product/i }))).toHaveCount(0);
  await page.goto(`/products/${product.id}`);
  await expect(page.getByRole('button', { name: /new spec|create spec/i }).or(page.getByRole('link', { name: /new spec|create spec/i }))).toHaveCount(0);
});
test('existing spec long-form editing persists a changed title', async ({ page, read }) => {
  const product = await createProduct(); const spec = await createSpec(product.id, { title: 'Original title' });
  await page.goto(`/specs/${spec.id}/edit`);
  await page.getByLabel('Title', { exact: true }).fill('Edited Spec');
  await page.getByRole('button', { name: /save/i }).click();
  await expect.poll(() => read(`specs/${spec.id}.yaml`)).toContain('Edited Spec');
});
test('existing product and spec do not offer deletion', async ({ page }) => {
  const product = await createProduct(); const spec = await createSpec(product.id);
  for (const route of [`/products/${product.id}`, `/specs/${spec.id}`]) {
    await page.goto(route);
    await expect(page.getByRole('button', { name: /^delete(?: product| spec)?$/i })).toHaveCount(0);
  }
});
