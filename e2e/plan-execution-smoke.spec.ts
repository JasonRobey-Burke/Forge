import { test, expect } from '@playwright/test';

test.describe('Plan execution smoke', () => {
  test('my work view shows assigned specs', async ({ page }) => {
    await page.goto('/my-work');
    await expect(page.getByRole('heading', { name: 'My Work' })).toBeVisible();
    await expect(page.getByText('SPEC-001')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Jason Robey' }).first()).toBeVisible();
  });

  test('product detail shows flow metrics', async ({ page }) => {
    await page.goto('/products/PROD-001');
    await expect(page.getByText('Flow Metrics')).toBeVisible();
    await expect(page.getByText('Bottlenecks')).toBeVisible();
  });

  test('board card opens preview drawer', async ({ page }) => {
    await page.goto('/products/PROD-001/board');
    await page.getByText('Project scaffolding and infrastructure').first().click();
    await expect(page.getByRole('heading', { name: 'Spec Preview' })).toBeVisible();
    await page.getByRole('button', { name: 'Open Full Spec' }).click();
    await expect(page).toHaveURL(/\/specs\/SPEC-001$/);
  });
});
