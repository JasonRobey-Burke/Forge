import { test, expect } from './workspace-fixtures';
import { parse } from 'yaml';
import type { Page } from '@playwright/test';
const files = {
  'products/PROD-1.yaml': 'product:\n  id: PROD-1\n  name: Planning product\n  status: active\n',
  'intentions/INT-1.yaml': 'intention:\n  id: INT-1\n  product: PROD-1\n  statement: Reliable planning\n  rationale: Reduce rework\n  owner: Avery\n  priority: high\n  status: defined # independent delivery\n  forge:\n    custom_extension: { nested: [one, two] } # preserve extension\n    roadmap: { bucket: now, rank: 1024, target_window: After partner review — no date agreed }\n',
  'intentions/INT-2.yaml': 'intention:\n  id: INT-2\n  product: PROD-1\n  statement: Next outcome\n  rationale: Prepare next\n  priority: medium\n  status: draft\n  forge:\n    roadmap: { bucket: now, rank: 2048 }\n',
  'intentions/INT-3.yaml': 'intention:\n  id: INT-3\n  product: PROD-1\n  statement: Last outcome\n  rationale: Prepare later\n  status: fulfilled\n',
  'specs/SPEC-1.yaml': 'spec:\n  id: SPEC-1\n  product: PROD-1\n  title: Delivery remains draft\n  status: draft\n  expectations: []\n  context: { stack: [], patterns: [], conventions: [], auth: "" }\n  validation: {}\n',
};
async function move(page: Page, id: string, destination: string) {
  const select = page.getByRole('combobox', { name: `Move ${id}`, exact: true });
  if (await select.count()) { await select.focus(); await select.selectOption({ label: destination }); }
  else { await page.getByRole('button', { name: `Move ${id}`, exact: true }).focus(); await page.keyboard.press('Enter'); const choice = page.getByRole('menuitem', { name: destination, exact: true }).or(page.getByRole('button', { name: destination, exact: true })); await choice.focus(); await page.keyboard.press('Enter'); }
}
test.beforeEach(async ({ seed }) => seed(files));
test('keyboard planning move persists only roadmap metadata and survives reload', async ({ page, read }) => {
  await page.goto('/products/PROD-1/roadmap');
  await expect(page.getByText('After partner review — no date agreed')).toBeVisible();
  await move(page, 'INT-1', 'Next');
  await expect.poll(async () => parse(await read('intentions/INT-1.yaml')).intention.forge.roadmap.bucket).toBe('next');
  const result = await read('intentions/INT-1.yaml'); const saved = parse(result).intention; const original = parse(files['intentions/INT-1.yaml']).intention;
  expect({ ...saved, forge: original.forge }).toEqual({ ...original, updated_at: expect.any(String) });
  expect(new Date(saved.updated_at).toISOString()).toBe(saved.updated_at);
  expect(saved.forge.custom_extension).toEqual(original.forge.custom_extension);
  expect(saved.forge.roadmap.target_window).toBe('After partner review — no date agreed');
  expect(result).toContain('status: defined # independent delivery');
  expect(result).toContain('    custom_extension: { nested: [one, two] } # preserve extension');
  expect(await read('specs/SPEC-1.yaml')).toBe(files['specs/SPEC-1.yaml']);
  expect(await read('intentions/INT-2.yaml')).toBe(files['intentions/INT-2.yaml']);
  await page.reload(); await expect(page.getByText('After partner review — no date agreed')).toBeVisible();
  await move(page, 'INT-1', 'Unscheduled');
  await expect.poll(async () => parse(await read('intentions/INT-1.yaml')).intention.forge.roadmap).toEqual({ target_window: 'After partner review — no date agreed' });
});
test('keyboard reorder writes only the selected intention rank', async ({ page, read }) => {
  await page.goto('/products/PROD-1/roadmap');
  await page.getByRole('button', { name: 'Move INT-2 earlier', exact: true }).focus(); await page.keyboard.press('Enter');
  await expect.poll(async () => parse(await read('intentions/INT-2.yaml')).intention.forge.roadmap.rank).toBeLessThan(1024);
  expect(await read('intentions/INT-1.yaml')).toBe(files['intentions/INT-1.yaml']);
  expect(await read('intentions/INT-3.yaml')).toBe(files['intentions/INT-3.yaml']);
  expect(await read('specs/SPEC-1.yaml')).toBe(files['specs/SPEC-1.yaml']);
});
