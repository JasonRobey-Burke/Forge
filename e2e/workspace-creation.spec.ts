import { test, expect } from './workspace-fixtures';
import { parse } from 'yaml';
import { createHash } from 'node:crypto';
import type { Page } from '@playwright/test';
const files = { 'products/PROD-1.yaml': 'product:\n  id: PROD-1\n  name: Creation product\n', 'intentions/INT-1.yaml': 'intention:\n  id: INT-1\n  product: PROD-1\n  statement: Parent intention\n  rationale: Parent rationale\n  status: draft\n  expectations: []\n' };
async function review(page: Page) { for (let step = 0; step < 6 && !await page.getByRole('button', { name: /review draft/i }).isVisible(); step++) await page.getByRole('button', { name: /^next$/i }).click(); await page.getByRole('button', { name: /review draft/i }).click(); }
async function author(page: Page, type: 'intentions' | 'expectations') {
  const fields: Array<[RegExp, string]> = type === 'intentions'
    ? [[/^purpose$/i, 'Users complete **reviewed work**'], [/^rationale$/i, 'Reduce avoidable rework'], [/^owner$/i, 'Avery']]
    : [[/measurable outcome/i, '95 percent finish within 2 seconds'], [/validation criteria/i, 'Measure 100 representative attempts'], [/edge case 1/i, 'Empty input offers guidance'], [/edge case 2/i, 'Offline preserves typed text'], [/^owner$/i, 'Avery']];
  const filled = new Set<number>(); let selected = false, confirmed = type === 'intentions';
  for (let step = 0; step < 6; step++) {
    for (const [index, [name, value]] of fields.entries()) { const field = page.getByRole('textbox', { name }); if (!filled.has(index) && await field.isVisible()) { await field.fill(value); filled.add(index); } }
    const select = page.getByRole('combobox', { name: type === 'intentions' ? /priority/i : /complexity/i });
    if (!selected && await select.isVisible()) {
      const choice = type === 'intentions' ? 'High' : 'Medium';
      if (await select.evaluate(el => el.tagName) === 'SELECT') await select.selectOption({ label: choice });
      else { await select.click(); await page.getByRole('option', { name: choice, exact: true }).click(); }
      selected = true;
    }
    const checkbox = page.getByRole('checkbox', { name: /I confirm these edge cases/i });
    if (!confirmed && await checkbox.isVisible()) { await checkbox.check(); confirmed = true; }
    if (filled.size === fields.length && selected && confirmed && await page.getByRole('button', { name: /review draft/i }).isVisible()) { await review(page); return; }
    await page.getByRole('button', { name: /^next$/i }).click();
  }
  throw new Error('Authored creation fields were not available');
}
test('creates a reviewed Draft intention from product overview and reads committed YAML back', async ({ page, seed, read }) => {
  await seed(files); await page.goto('/products/PROD-1'); await page.getByRole('button', { name: /new intention/i }).click();
  await author(page, 'intentions'); await expect(page.getByText(/Status: Draft/i)).toBeVisible();
  const response = page.waitForResponse(r => r.request().method() === 'POST' && /\/api\/intentions$/.test(r.url())); await page.getByRole('button', { name: /create draft/i }).click(); const created = await response; expect(created.status()).toBe(201); const result = await created.json();
  const child = parse(await read(result.meta.source.path)).intention; expect(child).toMatchObject({ id: result.data.id, product: 'PROD-1', statement: 'Users complete **reviewed work**', rationale: 'Reduce avoidable rework', owner: 'Avery', status: 'draft', dependencies: [], expectations: [] }); expect(child).not.toHaveProperty('title'); expect(child).not.toHaveProperty('confirmed'); expect(parse(await read('products/PROD-1.yaml')).product.intentions).toContain(child.id);
  await expect(page).toHaveURL(new RegExp(child.id));
});
test('creates an explicitly confirmed expectation from its expanded intention', async ({ page, seed, read }) => {
  await seed(files); await page.goto('/products/PROD-1');
  const create = page.getByRole('button', { name: /new expectation/i });
  if (!await create.isVisible()) await page.getByRole('button', { name: /Parent intention/i }).click(); await create.click();
  await author(page, 'expectations'); await expect(page.getByText(/Status: Draft/i)).toBeVisible();
  const response = page.waitForResponse(r => r.request().method() === 'POST' && /\/api\/expectations$/.test(r.url())); await page.getByRole('button', { name: /create draft/i }).click(); const created = await response; expect(created.status()).toBe(201); const result = await created.json();
  const child = parse(await read(result.meta.source.path)).expectation; expect(child).toMatchObject({ id: result.data.id, intention: 'INT-1', description: '95 percent finish within 2 seconds', validation_criteria: 'Measure 100 representative attempts', edge_cases: ['Empty input offers guidance', 'Offline preserves typed text'], owner: 'Avery', status: 'draft' }); expect(parse(await read('intentions/INT-1.yaml')).intention.expectations).toContain(child.id); await expect(page).toHaveURL(new RegExp(child.id));
});

test('retains a parent-conflict draft until explicit refreshed-parent review and retry', async ({ page, seed, read, write, request }) => {
  await seed(files); await page.goto('/products/PROD-1');
  const create = page.getByRole('button', { name: /new expectation/i });
  if (!await create.isVisible()) await page.getByRole('button', { name: /Parent intention/i }).click(); await create.click();
  await author(page, 'expectations');
  let observed!: () => void, release!: () => void;
  const intercepted = new Promise<void>(resolve => { observed = resolve; });
  const resumed = new Promise<void>(resolve => { release = resolve; });
  const endpoint = /\/api\/expectations$/;
  await page.route(endpoint, async route => { if (route.request().method() === 'POST') { observed(); await resumed; } await route.continue(); });
  const conflictResponse = page.waitForResponse(r => r.request().method() === 'POST' && endpoint.test(r.url()));
  await page.getByRole('button', { name: /create draft/i }).click(); await intercepted;
  const external = files['intentions/INT-1.yaml'] + '  owner: External owner\n';
  await write('intentions/INT-1.yaml', external);
  const freshRevision = `"${createHash('sha256').update(external).digest('hex')}"`;
  await expect.poll(async () => (await (await request.get('/api/intentions/INT-1')).json()).meta?.source?.revision).toBe(freshRevision);
  release(); expect((await conflictResponse).status()).toBe(409); await page.unroute(endpoint);
  await expect(page.getByRole('button', { name: 'Review updated parent' })).toBeVisible();
  expect(await read('intentions/INT-1.yaml')).toBe(external);
  await expect(page.getByText('95 percent finish within 2 seconds', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Review updated parent' }).click(); await review(page);
  const successResponse = page.waitForResponse(r => r.request().method() === 'POST' && endpoint.test(r.url()));
  await page.getByRole('button', { name: /create draft/i }).click(); const success = await successResponse;
  expect(success.status()).toBe(201); expect(success.request().headers()['if-match']).toBe(freshRevision);
  const result = await success.json(); const child = parse(await read(result.meta.source.path)).expectation;
  expect(child).toMatchObject({ description: '95 percent finish within 2 seconds', edge_cases: ['Empty input offers guidance', 'Offline preserves typed text'], status: 'draft' });
  expect(parse(await read('intentions/INT-1.yaml')).intention).toMatchObject({ owner: 'External owner', expectations: [child.id] });
});
