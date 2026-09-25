import { test, expect } from './workspace-fixtures';
import { parse } from 'yaml';
import { createProduct, createIntention, createExpectation, resetLegacyDocs, reviewCreationDraft } from './helpers';
test.beforeEach(async () => resetLegacyDocs());
test('creates a Draft expectation with two confirmed edge cases from its parent row', async ({ page, read }) => {
  const product = await createProduct(); const intention = await createIntention(product.id, { statement: 'Parent purpose' });
  await page.goto(`/products/${product.id}`);
  await page.getByRole('button', { name: 'Expand Parent purpose' }).click();
  await page.getByRole('button', { name: /new expectation/i }).click();
  await reviewCreationDraft(page, 'expectation');
  await expect(page.getByText(/Status: Draft/i)).toBeVisible();
  const response = page.waitForResponse(r => r.request().method() === 'POST' && /\/api\/expectations$/.test(r.url()));
  await page.getByRole('button', { name: /create draft/i }).click();
  const created = await response; expect(created.status()).toBe(201);
  const { data } = await created.json();
  expect(parse(await read(`expectations/${data.id}.yaml`)).expectation).toMatchObject({ description: 'New measurable result', edge_cases: ['First edge case', 'Second edge case'], status: 'draft', intention: intention.id });
});
test('edits measurable outcome independently of legacy title', async ({ page, read }) => {
  const product = await createProduct(); const intention = await createIntention(product.id);
  const expectation = await createExpectation(intention.id, { title: 'Legacy display title', description: 'Original result' });
  await page.goto(`/expectations/${expectation.id}`);
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByRole('textbox', { name: /measurable outcome/i }).fill('Edited measurable result');
  await page.getByRole('button', { name: /save expectation/i }).click();
  await expect.poll(async () => parse(await read(`expectations/${expectation.id}.yaml`)).expectation.description).toBe('Edited measurable result');
  expect(parse(await read(`expectations/${expectation.id}.yaml`)).expectation.title).toBe('Legacy display title');
});
test('expectation detail does not offer unsupported deletion', async ({ page }) => {
  const product = await createProduct(); const intention = await createIntention(product.id); const expectation = await createExpectation(intention.id);
  await page.goto(`/expectations/${expectation.id}`);
  await expect(page.getByRole('button', { name: /^delete(?: expectation)?$/i })).toHaveCount(0);
});
