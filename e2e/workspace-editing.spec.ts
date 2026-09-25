import { test, expect } from './workspace-fixtures';
import { parse } from 'yaml';
const files = {
  'products/PROD-1.yaml': 'product:\n  id: PROD-1\n  name: Editing product\n  owner: Avery\n  status: active\n  audience:\n    primary: Product teams\n    secondary: { groups: [Reviewers, Partners], notes: Keep nested audience } # preserve audience\n  context: { stack: [TypeScript], patterns: [], conventions: [], auth: Local }\n',
  'intentions/INT-1.yaml': 'intention:\n  id: INT-1\n  product: PROD-1\n  statement: Reliable edits\n  rationale: Preserve human work\n  status: defined\n  priority: high\n',
  'expectations/EXP-1.yaml': 'expectation:\n  id: EXP-1\n  intention: INT-1\n  description: Original outcome\n  status: ready\n  edge_cases: [Offline, External change]\n',
  'specs/SPEC-1.yaml': 'spec:\n  id: SPEC-1\n  product: PROD-1\n  title: Reliable implementation\n  status: draft\n  expectations: [EXP-1]\n  context: { stack: [], patterns: [], conventions: [], auth: "" }\n  validation: {}\n',
};
test.beforeEach(async ({ seed }) => seed(files));
test('confirmed full-page editing retains draft and its original save revision', async ({ page, request, read }) => {
  const revision = (await (await request.get('/api/expectations/EXP-1')).json()).meta.source.revision;
  await page.goto('/products/PROD-1');
  await page.getByRole('button', { name: 'Expand Reliable edits' }).click();
  await page.getByRole('button', { name: 'Edit EXP-1' }).click();
  await page.getByRole('textbox', { name: /measurable outcome/i }).fill('Draft carried into the full document');
  const open = page.getByRole('button', { name: /open document/i }).or(page.getByRole('link', { name: /open document/i }));
  await open.click();
  await page.getByRole('button', { name: 'Continue editing', exact: true }).click();
  await expect(page).toHaveURL(/\/expectations\/EXP-1(?:\?|$)/);
  await expect(page.getByRole('textbox', { name: /measurable outcome/i })).toHaveValue('Draft carried into the full document');
  const saveRequest = page.waitForRequest(request => request.method() === 'PUT' && new URL(request.url()).pathname === '/api/expectations/EXP-1');
  await page.getByRole('button', { name: /save expectation/i }).click();
  expect((await saveRequest).headers()['if-match']).toBe(revision);
  await expect.poll(() => read('expectations/EXP-1.yaml')).toContain('Draft carried into the full document');
});
test('product settings changes only primary audience and preserves nested secondary audience', async ({ page, read }) => {
  await page.goto('/products/PROD-1/edit');
  await page.getByRole('textbox', { name: /^primary audience$/i }).fill('Independent product owners');
  await page.getByRole('button', { name: /save product/i }).click();
  await expect.poll(async () => parse(await read('products/PROD-1.yaml')).product.audience.primary).toBe('Independent product owners');
  const result = await read('products/PROD-1.yaml');
  const saved = parse(result).product;
  expect(saved).toEqual({ ...parse(files['products/PROD-1.yaml']).product, audience: { ...parse(files['products/PROD-1.yaml']).product.audience, primary: 'Independent product owners' }, updated_at: expect.any(String) });
  expect(new Date(saved.updated_at).toISOString()).toBe(saved.updated_at);
  expect(result).toContain('    secondary: { groups: [Reviewers, Partners], notes: Keep nested audience } # preserve audience');
});
test('failed YAML save retains exact source and rejects a lifecycle bypass', async ({ page, read }) => {
  await page.goto('/specs/SPEC-1');
  await page.getByRole('button', { name: /edit yaml/i }).or(page.getByRole('link', { name: /edit yaml/i })).click();
  const input = page.getByRole('textbox', { name: /^yaml source$/i });
  const invalid = 'spec: [broken';
  await input.fill(invalid); await page.getByRole('button', { name: /save yaml/i }).click();
  await expect(input).toHaveValue(invalid);
  await expect(page.getByRole('alert')).toContainText(/yaml|parse|invalid|source/i);
  const bypass = files['specs/SPEC-1.yaml'].replace('status: draft', 'status: done');
  await input.fill(bypass); await page.getByRole('button', { name: /save yaml/i }).click();
  await expect(input).toHaveValue(bypass);
  await expect(page.getByRole('alert')).toContainText(/phase|transition|lifecycle|status/i);
  expect(await read('specs/SPEC-1.yaml')).toBe(files['specs/SPEC-1.yaml']);
});
