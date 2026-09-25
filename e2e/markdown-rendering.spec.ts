import { test, expect } from './workspace-fixtures';
import { createProduct, createSpec, resetLegacyDocs, updateSpec } from './helpers';
test.beforeEach(async () => resetLegacyDocs());
test('spec prose renders markdown formatting, not literal syntax', async ({ page }) => {
  const product = await createProduct();
  const spec = await createSpec(product.id);
  await updateSpec(spec.id, { description: 'This has **bold** text and a list:\n\n- item one\n- item two' });
  await page.goto(`/specs/${spec.id}`);
  await expect(page.locator('strong', { hasText: 'bold' })).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: /^item one$/ })).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: /^item two$/ })).toBeVisible();
  await expect(page.getByText('**bold**', { exact: true })).toHaveCount(0);
  await expect(page.getByText('- item one', { exact: true })).toHaveCount(0);
});
