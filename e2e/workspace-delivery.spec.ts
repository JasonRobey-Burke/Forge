import { test, expect } from './workspace-fixtures';
const files = {
  'products/PROD-1.yaml': 'product:\n  id: PROD-1\n  name: Delivery contract\n  wip_limits: { draft: 5, ready: 5, in_progress: 5, review: 5, validating: 5 }\n',
  'intentions/INT-1.yaml': 'intention:\n  id: INT-1\n  product: PROD-1\n  statement: First outcome\n',
  'intentions/INT-10.yaml': 'intention:\n  id: INT-10\n  product: PROD-1\n  statement: Other outcome\n',
  'expectations/EXP-1.yaml': 'expectation:\n  id: EXP-1\n  intention: INT-1\n  description: First expectation\n  edge_cases: [One, Two]\n',
  'expectations/EXP-10.yaml': 'expectation:\n  id: EXP-10\n  intention: INT-10\n  description: Other expectation\n  edge_cases: [One, Two]\n',
  'specs/SPEC-1.yaml': 'spec:\n  id: SPEC-1\n  product: PROD-1\n  title: Shared delivery\n  status: draft\n  expectations: [EXP-1, EXP-10]\n  context: { stack: [], patterns: [], conventions: [], auth: "" }\n  validation: {}\n',
  'specs/SPEC-10.yaml': 'spec:\n  id: SPEC-10\n  product: PROD-1\n  title: Unrelated delivery\n  status: draft\n  expectations: [EXP-10]\n  context: { stack: [], patterns: [], conventions: [], auth: "" }\n  validation: {}\n',
};
test.beforeEach(async ({ seed }) => { await seed(files); });
test('exact outcome filtering retains whole-product WIP and shared outcome links', async ({ page, read }) => {
  const before = await read('specs/SPEC-1.yaml');
  await page.goto('/products/PROD-1/board?outcome=INT-1');
  await expect(page.getByText('Shared delivery', { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByText('Unrelated delivery', { exact: true }).filter({ visible: true })).toHaveCount(0);
  await expect(page.locator('[data-phase="Draft"]').getByText('2/5', { exact: true })).toBeVisible();
  for (const phase of ['Draft', 'Ready', 'In Progress', 'Review', 'Validating', 'Done']) await expect(page.getByText(phase, { exact: true }).first()).toBeVisible();
  for (const id of ['INT-1', 'INT-10']) await expect(page.locator(`a[href*="outcome=${id}"]`).filter({ hasText: id === 'INT-1' ? 'First outcome' : 'Other outcome' }).first()).toBeVisible();
  await page.getByText('Shared delivery', { exact: true }).filter({ visible: true }).click();
  await page.getByRole('link', { name: 'Open Full Spec' }).click();
  await expect(page).toHaveURL(/\/specs\/SPEC-1(?:\?|$)/);
  expect(await read('specs/SPEC-1.yaml')).toBe(before);
});
test('keyboard transition surfaces corrective gate text and authoritative denial preserves source', async ({ page, request, read }) => {
  const before = await read('specs/SPEC-1.yaml');
  await page.goto('/products/PROD-1/board?outcome=INT-1');
  await page.getByRole('button', { name: 'Move Shared delivery to another phase' }).focus(); await page.keyboard.press('Enter');
  const ready = page.getByRole('menuitem', { name: 'Move to Ready', exact: true });
  await expect(ready).toBeVisible();
  if (await ready.isEnabled()) { await ready.focus(); await page.keyboard.press('Enter'); }
  await expect(page.getByText(/checklist.*(?:incomplete|missing|required)|(?:complete|missing|required).*checklist|(?:add|provide|define|missing).*(?:context|boundaries|deliverables|validation)/i).first()).toBeVisible();
  await expect(page.locator('a[href*="/specs/SPEC-1"]').filter({ hasText: /checklist|complete|fix|review|open/i }).first()).toBeVisible();
  const entity = await (await request.get('/api/specs/SPEC-1')).json();
  const denied = await request.post('/api/specs/SPEC-1/transition', { headers: { 'If-Match': entity.meta.source.revision }, data: { to_phase: 'Ready' } });
  expect(denied.status()).toBeGreaterThanOrEqual(400); expect(denied.status()).toBeLessThan(500);
  expect((await denied.json()).error).toBeTruthy(); expect(await read('specs/SPEC-1.yaml')).toBe(before);
  const emptyOverride = await request.post('/api/specs/SPEC-1/transition', { headers: { 'If-Match': entity.meta.source.revision }, data: { to_phase: 'Ready', override_reason: '   ' } });
  expect(emptyOverride.status()).toBeGreaterThanOrEqual(400); expect(await read('specs/SPEC-1.yaml')).toBe(before);
});
