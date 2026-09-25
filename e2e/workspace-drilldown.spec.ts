import { test, expect } from './workspace-fixtures';
import type { Locator, Page } from '@playwright/test';
import { stringify } from 'yaml';

// Counts describe delivery records; sharing and Done never imply validation.
const files: Record<string, string> = {
  'products/PROD-1.yaml': stringify({ product: { id: 'PROD-1', name: 'Phase drilldown product', status: 'active' } }),
  'products/PROD-2.yaml': stringify({ product: { id: 'PROD-2', name: 'Other product', status: 'active' } }),
};
for (const [id, product, statement] of [
  ['INT-1', 'PROD-1', 'First outcome'],
  ['INT-2', 'PROD-1', 'Second outcome'],
  ['INT-3', 'PROD-2', 'Other product outcome'],
]) files[`intentions/${id}.yaml`] = stringify({ intention: { id, product, statement, status: 'defined' } });
for (const [id, intention] of [['EXP-1', 'INT-1'], ['EXP-2', 'INT-1'], ['EXP-3', 'INT-2'], ['EXP-4', 'INT-3']]) {
  files[`expectations/${id}.yaml`] = stringify({ expectation: { id, intention, description: `Outcome for ${id}`, status: 'ready', edge_cases: ['Offline', 'Empty input'] } });
}
for (const [id, product, title, status, expectations] of [
  ['SPEC-1', 'PROD-1', 'Shared completed delivery', 'done', ['EXP-1', 'EXP-2', 'EXP-3']],
  ['SPEC-2', 'PROD-1', 'Second outcome completed delivery', 'done', ['EXP-3']],
  ['SPEC-3', 'PROD-1', 'First outcome draft delivery', 'draft', ['EXP-1']],
  ['SPEC-4', 'PROD-1', 'Unrecognized phase delivery', 'future-phase', ['EXP-2']],
  ['SPEC-5', 'PROD-2', 'Other product completed delivery', 'done', ['EXP-4']],
] as const) {
  files[`specs/${id}.yaml`] = stringify({ spec: { id, product, title, status, expectations, context: { stack: [], patterns: [], conventions: [], auth: '' }, validation: {} } });
}

async function expectMembers(region: Locator, ids: string[]) {
  await expect.poll(() => region.getByRole('link').evaluateAll(links => links.flatMap(link => {
    const match = new URL((link as HTMLAnchorElement).href).pathname.match(/^\/specs\/(SPEC-[^/]+)$/);
    return match ? [match[1]] : [];
  }).sort())).toEqual([...ids].sort());
}
async function phase(page: Page, name: string) {
  const control = page.getByRole('combobox', { name: 'Filter by phase', exact: true });
  await expect(control).toBeVisible();
  if (await control.evaluate(element => element.tagName) === 'SELECT') await control.selectOption({ label: name });
  else { await control.click(); await page.getByRole('option', { name, exact: true }).click(); }
}
async function productDone(page: Page) {
  await page.goto('/products/PROD-1');
  const count = page.getByRole('link', { name: /Spec delivery/i });
  await expect(count).toContainText('2 of 4 Done');
  await count.click();
  const region = page.getByRole('region', { name: 'Supporting records', exact: true });
  await expect(region).toBeVisible();
  return region;
}

test.beforeEach(async ({ seed }) => seed(files));

test('product Done count opens exactly its unique Done specs and phase selection survives reload', async ({ page }) => {
  const region = await productDone(page);
  await expectMembers(region, ['SPEC-1', 'SPEC-2']);
  const doneURL = page.url();
  await phase(page, 'Draft');
  await expectMembers(region, ['SPEC-3']);
  expect(page.url()).not.toBe(doneURL);
  const draftURL = page.url();
  await page.reload();
  await expect(page).toHaveURL(draftURL);
  await expectMembers(page.getByRole('region', { name: 'Supporting records', exact: true }), ['SPEC-3']);
  await phase(page, 'All phases');
  await expectMembers(page.getByRole('region', { name: 'Supporting records', exact: true }), ['SPEC-1', 'SPEC-2', 'SPEC-3', 'SPEC-4']);
});

test('outcome Done count deduplicates shared specs and phase changes retain the selected outcome', async ({ page }) => {
  await page.goto('/products/PROD-1');
  const outcome = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: 'First outcome', exact: true, level: 3 }) });
  const done = outcome.getByRole('link', { name: /^1\s+Done$/i });
  await expect(done).toBeVisible();
  await done.click();
  const region = page.getByRole('region', { name: 'Supporting records', exact: true });
  await expectMembers(region, ['SPEC-1']);
  const filteredURL = page.url();
  await page.reload();
  await expect(page).toHaveURL(filteredURL);
  await expectMembers(page.getByRole('region', { name: 'Supporting records', exact: true }), ['SPEC-1']);
  await phase(page, 'All phases');
  await expectMembers(page.getByRole('region', { name: 'Supporting records', exact: true }), ['SPEC-1', 'SPEC-3', 'SPEC-4']);
  await phase(page, 'Draft');
  await expectMembers(page.getByRole('region', { name: 'Supporting records', exact: true }), ['SPEC-3']);
});

test('unrecognized recorded phases remain inspectable as Unknown without changing source', async ({ page, read }) => {
  const original = await read('specs/SPEC-4.yaml');
  const region = await productDone(page);
  await phase(page, 'Unknown');
  await expectMembers(region, ['SPEC-4']);
  await expect(region.getByRole('link', { name: /SPEC-4|Unrecognized phase delivery/i })).toBeVisible();
  const unknownURL = page.url();
  await page.reload();
  await expect(page).toHaveURL(unknownURL);
  await expectMembers(page.getByRole('region', { name: 'Supporting records', exact: true }), ['SPEC-4']);
  expect(await read('specs/SPEC-4.yaml')).toBe(original);
});
