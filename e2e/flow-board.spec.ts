import { test, expect } from '@playwright/test';
import { resetLegacyDocs } from './helpers';
test.beforeEach(async () => resetLegacyDocs());
import { createProduct, createSpec, deleteEntity, transitionSpec } from './helpers';

test.describe('Flow Board', () => {
  let productId: string;

  test.beforeEach(async () => {
    const product = await createProduct({ name: 'E2E Flow Board Product' });
    productId = product.id;
  });

  test.afterEach(async () => {
    await deleteEntity('products', productId);
  });

  test('navigate to flow board from product detail', async ({ page }) => {
    await page.goto(`/products/${productId}`);
    await page.getByRole('link', { name: 'Delivery', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/products/${productId}/board`));
    await expect(page.getByRole('heading', { name: /Delivery|Flow Board/ })).toBeVisible();
  });

  test('renders six phase columns', async ({ page }) => {
    await page.goto(`/products/${productId}/board`);
    await expect(page.getByText('Draft', { exact: true }).filter({ visible: true })).toBeVisible();
    await expect(page.getByText('Ready', { exact: true }).filter({ visible: true })).toBeVisible();
    await expect(page.getByText('In Progress', { exact: true }).filter({ visible: true })).toBeVisible();
    await expect(page.getByText('Review', { exact: true }).filter({ visible: true })).toBeVisible();
    await expect(page.getByText('Validating', { exact: true }).filter({ visible: true })).toBeVisible();
    await expect(page.getByText('Done', { exact: true }).filter({ visible: true })).toBeVisible();
  });

  test('shows empty state in columns with no specs', async ({ page }) => {
    await page.goto(`/products/${productId}/board`);
    const emptyMessages = page.getByText('No specs in this phase');
    await expect(emptyMessages.first()).toBeVisible();
  });

  test('displays spec cards in correct columns', async ({ page }) => {
    const spec1 = await createSpec(productId, { title: 'Draft Card E2E' });
    const spec2 = await createSpec(productId, { title: 'Review Card E2E', status: 'review' });

    await page.goto(`/products/${productId}/board`);

    // Draft column should have spec1
    const draftColumn = page.locator('[data-phase="Draft"]');
    await expect(draftColumn.getByText('Draft Card E2E')).toBeVisible();

    // Review column should have spec2
    const reviewColumn = page.locator('[data-phase="Review"]');
    await expect(reviewColumn.getByText('Review Card E2E')).toBeVisible();

    // Cleanup
    await deleteEntity('specs', spec1.id);
    await deleteEntity('specs', spec2.id);
  });

  test('shows WIP count in column badge', async ({ page }) => {
    const spec1 = await createSpec(productId, { title: 'WIP Count Spec 1' });
    const spec2 = await createSpec(productId, { title: 'WIP Count Spec 2' });

    await page.goto(`/products/${productId}/board`);

    // Draft column should show 2/5 (default WIP limit for draft is 5)
    const draftColumn = page.locator('[data-phase="Draft"]');
    await expect(draftColumn.getByText('2/5')).toBeVisible();

    await deleteEntity('specs', spec1.id);
    await deleteEntity('specs', spec2.id);
  });

  test('navigates to spec detail on card click', async ({ page }) => {
    const spec = await createSpec(productId, { title: 'Clickable Card E2E' });

    await page.goto(`/products/${productId}/board`);
    await page.getByRole('button', { name: 'Clickable Card E2E', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Spec Preview' })).toBeVisible();
    await page.getByRole('link', { name: 'Open Full Spec', exact: true }).or(page.getByRole('button', { name: 'Open Full Spec', exact: true })).click();
    await expect(page).toHaveURL(new RegExp(`/specs/${spec.id}`));

    await deleteEntity('specs', spec.id);
  });

  test('back to product link works', async ({ page }) => {
    await page.goto(`/products/${productId}/board`);
    await page.getByRole('link', { name: 'Overview', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/products/${productId}`));
  });
});
