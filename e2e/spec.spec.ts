import { test, expect } from '@playwright/test';
import { createProduct, createSpec, deleteEntity } from './helpers';

test.describe('Spec CRUD', () => {
  let productId: string;

  test.beforeAll(async () => {
    const product = await createProduct({ name: 'E2E Spec Test Product' });
    productId = product.id;
  });

  test.afterAll(async () => {
    await deleteEntity('products', productId);
  });

  test('navigate to specs list from product detail', async ({ page }) => {
    await page.goto(`/products/${productId}`);
    await page.getByRole('link', { name: 'View Specs' }).click();
    await expect(page).toHaveURL(new RegExp(`/products/${productId}/specs`));
    await expect(page.getByText('Specs')).toBeVisible();
  });

  test('create a spec with context inheritance', async ({ page }) => {
    await page.goto(`/products/${productId}/specs/new`);
    await page.getByLabel('Title').fill('Test Spec E2E');
    await page.getByLabel('Description').fill('Created by E2E test');
    await page.getByRole('button', { name: 'Create Spec' }).click();
    await expect(page.getByText('Test Spec E2E')).toBeVisible();
  });

  test('edit a spec', async ({ page }) => {
    const spec = await createSpec(productId, { title: 'Spec to Edit' });
    await page.goto(`/specs/${spec.id}/edit`);
    await page.getByLabel('Title').fill('Edited Spec');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByText('Edited Spec')).toBeVisible();
  });

  test('delete a spec', async ({ page }) => {
    const spec = await createSpec(productId, { title: 'Spec to Delete' });
    await page.goto(`/specs/${spec.id}`);
    await page.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Delete' }).nth(1).click();
    await expect(page).toHaveURL(new RegExp(`/products/${productId}/specs`));
  });
});
