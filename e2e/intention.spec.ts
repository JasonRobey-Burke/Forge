import { test, expect } from './workspace-fixtures';
import { parse } from 'yaml';
import { createProduct, createIntention, createExpectation, resetLegacyDocs, reviewCreationDraft } from './helpers';
test.beforeEach(async () => resetLegacyDocs());
test('Overview shows existing intention purposes', async ({ page }) => {
  const product = await createProduct(); await createIntention(product.id, { statement: 'Purpose on Overview' });
  await page.goto(`/products/${product.id}`);
  await expect(page.getByRole('button', { name: 'Expand Purpose on Overview' })).toBeVisible();
});
test('creates an intention only after reviewing its Draft', async ({ page, read }) => {
  const product = await createProduct();
  await page.goto(`/products/${product.id}`);
  await page.getByRole('button', { name: /new intention/i }).click();
  await reviewCreationDraft(page, 'intention');
  await expect(page.getByText(/Status: Draft/i)).toBeVisible();
  const response = page.waitForResponse(r => r.request().method() === 'POST' && /\/api\/intentions$/.test(r.url()));
  await page.getByRole('button', { name: /create draft/i }).click();
  const created = await response; expect(created.status()).toBe(201);
  const { data } = await created.json();
  expect(parse(await read(`intentions/${data.id}.yaml`)).intention).toMatchObject({ statement: 'New intentional outcome', status: 'draft', product: product.id });
});
test('edits canonical purpose independently of legacy display title', async ({ page, read }) => {
  const product = await createProduct(); const intention = await createIntention(product.id, { title: 'Legacy display title', statement: 'Original purpose' });
  await page.goto(`/intentions/${intention.id}`);
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByRole('textbox', { name: /^purpose$/i }).fill('Edited purpose');
  await page.getByRole('button', { name: /save intention/i }).click();
  await expect.poll(async () => parse(await read(`intentions/${intention.id}.yaml`)).intention.statement).toBe('Edited purpose');
  expect(parse(await read(`intentions/${intention.id}.yaml`)).intention.title).toBe('Legacy display title');
});
for (const children of [false, true]) {
  test(`intention ${children ? 'with' : 'without'} children does not offer unsupported deletion`, async ({ page }) => {
    const product = await createProduct(); const intention = await createIntention(product.id);
    if (children) await createExpectation(intention.id);
    await page.goto(`/intentions/${intention.id}`);
    await expect(page.getByRole('button', { name: /^delete(?: intention)?$/i })).toHaveCount(0);
  });
}
