import { test, expect } from './workspace-fixtures';
import { createProduct, createSpec, resetLegacyDocs } from './helpers';
test.beforeEach(async () => {
  await resetLegacyDocs();
  const product = await createProduct();
  await createSpec(product.id, { title: 'Assigned implementation', owner: 'Fixture owner', status: 'in-progress' });
});
test('my work view shows fixture assigned specs', async ({ page }) => {
  await page.goto('/my-work');
  await expect(page.getByRole('heading', { name: 'My Work' })).toBeVisible();
  await expect(page.getByText('SPEC-1', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Fixture owner' }).first()).toBeVisible();
});
test('Delivery navigation retains access to product pipeline metrics', async ({ page }) => {
  await page.goto('/products/PROD-1/board');
  await page.getByRole('link', { name: 'Metrics', exact: true }).click();
  await expect(page).toHaveURL(/\/products\/PROD-1\/metrics$/);
  await expect(page.getByRole('heading', { name: /Pipeline Metrics/i })).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'SPEC-1' })).toContainText('Assigned implementation');
});
test('board preview opens the full fixture spec', async ({ page }) => {
  await page.goto('/products/PROD-1/board');
  await page.getByRole('button', { name: 'Assigned implementation', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Spec Preview' })).toBeVisible();
  await page.getByRole('link', { name: 'Open Full Spec', exact: true }).or(page.getByRole('button', { name: 'Open Full Spec', exact: true })).click();
  await expect(page).toHaveURL(/\/specs\/SPEC-1$/);
});
