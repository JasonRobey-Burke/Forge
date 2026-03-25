import { test, expect } from '@playwright/test';
import { createProduct, createIntention, createExpectation, deleteEntity } from './helpers';

test.describe('Expectation CRUD', () => {
  let productId: string;
  let intentionId: string;

  test.beforeAll(async () => {
    const product = await createProduct({ name: 'E2E Expectation Test Product' });
    productId = product.id;
    const intention = await createIntention(productId, { title: 'E2E Test Intention' });
    intentionId = intention.id;
  });

  test.afterAll(async () => {
    await deleteEntity('products', productId);
  });

  test('create expectation with 2 edge cases', async ({ page }) => {
    await page.goto(`/intentions/${intentionId}/expectations/new`);
    await page.getByLabel('Title').fill('Test Expectation E2E');
    await page.getByLabel('Description').fill('Created by E2E test');
    await page.getByPlaceholder('Edge case 1').fill('First edge case');
    await page.getByPlaceholder('Edge case 2').fill('Second edge case');
    await page.getByRole('button', { name: 'Create Expectation' }).click();
    await expect(page.getByText('Test Expectation E2E')).toBeVisible();
  });

  test('edit an expectation', async ({ page }) => {
    const expectation = await createExpectation(intentionId, { title: 'Expectation to Edit' });
    await page.goto(`/expectations/${expectation.id}`);
    await page.getByRole('button', { name: 'Edit' }).click();
    const titleInput = page.locator('input[name="title"]');
    await titleInput.fill('Edited Expectation');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Edited Expectation')).toBeVisible();
  });

  test('delete an expectation', async ({ page }) => {
    const expectation = await createExpectation(intentionId, { title: 'Expectation to Delete' });
    await page.goto(`/expectations/${expectation.id}`);
    await page.getByRole('button', { name: 'Delete' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Delete' }).click();
    await expect(page).toHaveURL(new RegExp(`/intentions/${intentionId}/expectations`));
  });
});
