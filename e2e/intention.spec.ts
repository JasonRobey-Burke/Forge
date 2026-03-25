import { test, expect } from '@playwright/test';
import { createProduct, createIntention, createExpectation, deleteEntity } from './helpers';

test.describe('Intention CRUD', () => {
  let productId: string;

  test.beforeAll(async () => {
    const product = await createProduct({ name: 'E2E Intention Test Product' });
    productId = product.id;
  });

  test.afterAll(async () => {
    await deleteEntity('products', productId);
  });

  test('navigate to intentions list from product detail', async ({ page }) => {
    await page.goto(`/products/${productId}`);
    await page.getByRole('link', { name: 'View Intentions' }).click();
    await expect(page).toHaveURL(new RegExp(`/products/${productId}/intentions`));
    await expect(page.getByRole('heading', { name: 'Intentions' })).toBeVisible();
  });

  test('create a new intention', async ({ page }) => {
    await page.goto(`/products/${productId}/intentions/new`);
    await page.getByLabel('Title').fill('Test Intention E2E');
    await page.getByLabel('Description').fill('Created by E2E test');
    await page.getByRole('button', { name: 'Create Intention' }).click();
    await expect(page.getByText('Test Intention E2E')).toBeVisible();
  });

  test('edit an intention', async ({ page }) => {
    const intention = await createIntention(productId, { title: 'Intention to Edit' });
    await page.goto(`/intentions/${intention.id}`);
    await page.getByRole('button', { name: 'Edit' }).click();
    const titleInput = page.locator('input[name="title"]');
    await titleInput.fill('Edited Intention');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Edited Intention')).toBeVisible();
  });

  test('delete an intention with no children', async ({ page }) => {
    const intention = await createIntention(productId, { title: 'Intention to Delete' });
    await page.goto(`/intentions/${intention.id}`);
    await page.getByRole('button', { name: 'Delete' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Delete' }).click();
    await expect(page).toHaveURL(new RegExp(`/products/${productId}/intentions`));
  });

  test('cannot delete an intention with expectations', async ({ page }) => {
    const intention = await createIntention(productId, { title: 'Protected Intention' });
    await createExpectation(intention.id, { title: 'Child Expectation' });
    await page.goto(`/intentions/${intention.id}`);

    // Listen for the alert dialog before triggering the delete
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Cannot delete intention with active expectations');
      await dialog.accept();
    });

    await page.getByRole('button', { name: 'Delete' }).click();
    const confirmDialog = page.getByRole('dialog');
    await confirmDialog.getByRole('button', { name: 'Delete' }).click();

    // Should stay on the same page after alert is dismissed
    await expect(page).toHaveURL(new RegExp(`/intentions/${intention.id}`));
  });
});
