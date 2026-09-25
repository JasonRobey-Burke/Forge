import { test, expect } from './workspace-fixtures';
import type { Page } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const files = {
  'products/PROD-1.yaml': 'product:\n  id: PROD-1\n  name: Safety product\n  status: active\n',
  'intentions/INT-1.yaml': 'intention:\n  id: INT-1\n  product: PROD-1\n  statement: Reliable edits\n  rationale: Preserve drafts\n  status: defined\n',
  'expectations/EXP-1.yaml': 'expectation:\n  id: EXP-1\n  intention: INT-1\n  description: Original outcome\n  status: ready\n  edge_cases: []\n',
};
async function openEditor(page: Page) {
  await page.goto('/products/PROD-1');
  await page.getByRole('button', { name: 'Expand Reliable edits' }).click();
  await page.getByRole('button', { name: 'Edit EXP-1' }).click();
  return page.getByRole('textbox', { name: /measurable outcome/i });
}
test.beforeEach(async ({ seed }) => seed(files));
for (const damage of ['deleted', 'malformed'] as const) {
  test(`externally ${damage} source retains captured editor and cannot be recreated or force overwritten`, async ({ page, docsRoot, write, read }) => {
    const input = await openEditor(page);
    await input.fill('Irreplaceable local draft');
    if (damage === 'deleted') {
      const root = await fs.realpath(docsRoot);
      expect(path.dirname(root)).toBe(await fs.realpath(os.tmpdir()));
      expect(path.basename(root)).toMatch(/^forge-workspace-e2e-/);
      const target = await fs.realpath(path.join(root, 'expectations/EXP-1.yaml'));
      expect(target.startsWith(root + path.sep)).toBe(true);
      await fs.unlink(target);
    } else await write('expectations/EXP-1.yaml', 'expectation: [broken');
    await expect(page.getByText('File changed outside Forge')).toBeVisible();
    await expect(input).toHaveValue('Irreplaceable local draft');
    for (const name of [/compare/i, /reload/i, /copy.*draft/i]) await expect(page.getByRole('button', { name })).toBeVisible();
    await expect(page.getByRole('button', { name: /force.*(save|overwrite)|recreate/i })).toHaveCount(0);
    const save = page.getByRole('button', { name: /save expectation/i });
    if (await save.isEnabled()) {
      await save.click();
      await expect(page.getByRole('alert')).toContainText(/conflict|changed|missing|deleted|invalid|source/i);
    }
    await expect(input).toHaveValue('Irreplaceable local draft');
    if (damage === 'deleted') await expect(fs.stat(path.join(docsRoot, 'expectations/EXP-1.yaml'))).rejects.toMatchObject({ code: 'ENOENT' });
    else expect(await read('expectations/EXP-1.yaml')).toBe('expectation: [broken');
  });
}
test('network-aborted save preserves text and disk, announces failure, then permits retry', async ({ page, read }) => {
  const input = await openEditor(page);
  await input.fill('Retry after connection loss');
  let aborted = false;
  await page.route('**/api/expectations/EXP-1', async route => {
    if (route.request().method() === 'PUT' && !aborted) { aborted = true; await route.abort('failed'); }
    else await route.continue();
  });
  const save = page.getByRole('button', { name: /save expectation/i });
  await save.click();
  await expect(page.getByRole('alert')).toContainText(/fail|network|fetch|connection|save/i);
  expect(aborted).toBe(true);
  await expect(input).toHaveValue('Retry after connection loss');
  expect(await read('expectations/EXP-1.yaml')).toBe(files['expectations/EXP-1.yaml']);
  await page.unroute('**/api/expectations/EXP-1');
  await save.click();
  await expect.poll(() => read('expectations/EXP-1.yaml')).toContain('Retry after connection loss');
  const savedAnnouncement = page.locator('[role="status"], [aria-live="polite"], [aria-live="assertive"]').getByText(/saved/i).first();
  await expect(savedAnnouncement).toBeVisible();
  expect(await savedAnnouncement.evaluate(element => element.closest('[aria-hidden="true"]') === null)).toBe(true);
});
test('pending save prevents a second submit', async ({ page, read }) => {
  const input = await openEditor(page);
  await input.fill('Only one submission');
  let submissions = 0;
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/expectations/EXP-1', async route => {
    if (route.request().method() === 'PUT') { submissions++; await pending; }
    await route.continue();
  });
  const save = page.getByRole('button', { name: /save expectation|saving/i });
  try {
    await save.click();
    await expect.poll(() => submissions).toBe(1);
    await expect(save).toBeDisabled();
    await input.press('Enter');
    expect(submissions).toBe(1);
  } finally { release(); }
  await expect.poll(() => read('expectations/EXP-1.yaml')).toContain('Only one submission');
  expect(submissions).toBe(1);
});
test('unavailable recovery storage warns while keeping the draft usable', async ({ page, read }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = function () { throw new DOMException('Storage unavailable', 'QuotaExceededError'); };
  });
  const input = await openEditor(page);
  await input.fill('In-memory draft survives storage failure');
  await expect(page.getByText(/recovery.*(unavailable|fail)|unable.*(recover|draft)|cannot.*(recover|draft)|could not.*(recover|draft)/i)).toBeVisible();
  await expect(input).toHaveValue('In-memory draft survives storage failure');
  await page.getByRole('button', { name: /save expectation/i }).click();
  await expect.poll(() => read('expectations/EXP-1.yaml')).toContain('In-memory draft survives storage failure');
});
test('session recovery offers explicit restoration without silently replacing current source', async ({ page }) => {
  const input = await openEditor(page);
  await input.fill('Recoverable session draft');
  await expect.poll(() => page.evaluate(() => Object.values(sessionStorage).some(value => value.includes('Recoverable session draft')))).toBe(true);
  await page.reload();
  const expand = page.getByRole('button', { name: 'Expand Reliable edits' });
  const collapse = page.getByRole('button', { name: 'Collapse Reliable edits' });
  const editor = page.getByRole('textbox', { name: /measurable outcome/i });
  await expect(editor.or(expand).or(collapse)).toBeVisible();
  if (!await editor.isVisible()) {
    if (await expand.isVisible()) await expand.click();
    await page.getByRole('button', { name: 'Edit EXP-1' }).click();
  }
  const restoredInput = page.getByRole('textbox', { name: /measurable outcome/i });
  await expect(restoredInput).toHaveValue('Original outcome');
  const restore = page.getByRole('button', { name: /^(?:restore|recover|review).*draft/i });
  await expect(restore).toBeVisible();
  await restore.click();
  await expect(restoredInput).toHaveValue('Recoverable session draft');
});
test('corrupt recovery entry is not replayed and a new in-memory draft remains usable', async ({ page }) => {
  const input = await openEditor(page);
  await input.fill('Fixture draft to corrupt');
  await expect.poll(() => page.evaluate(() => Object.entries(sessionStorage).filter(([, value]) => value.includes('Fixture draft to corrupt')).length)).toBeGreaterThan(0);
  await page.evaluate(() => {
    for (const [key, value] of Object.entries(sessionStorage)) if (value.includes('Fixture draft to corrupt')) sessionStorage.setItem(key, '{invalid recovery');
  });
  await page.reload();
  const expand = page.getByRole('button', { name: 'Expand Reliable edits' });
  const collapse = page.getByRole('button', { name: 'Collapse Reliable edits' });
  const editor = page.getByRole('textbox', { name: /measurable outcome/i });
  await expect(editor.or(expand).or(collapse)).toBeVisible();
  if (!await editor.isVisible()) {
    if (await expand.isVisible()) await expand.click();
    await page.getByRole('button', { name: 'Edit EXP-1' }).click();
  }
  await expect(page.getByRole('button', { name: /^(?:restore|recover).*draft/i })).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: /measurable outcome/i })).toHaveValue('Original outcome');
  const fresh = page.getByRole('textbox', { name: /measurable outcome/i });
  await fresh.fill('New draft after corruption');
  await expect(fresh).toHaveValue('New draft after corruption');
});
test('navigation protects a full-page draft and saving the next artifact uses its own source revision', async ({ page, seed, request, read }) => {
  const second = 'expectation:\n  id: EXP-2\n  intention: INT-1\n  description: Second outcome\n  status: ready\n  edge_cases: []\n';
  await seed({ ...files, 'expectations/EXP-2.yaml': second });
  const revisionB = (await (await request.get('/api/expectations/EXP-2')).json()).meta.source.revision;
  await page.goto('/expectations/EXP-1?edit=1');
  const input = page.getByRole('textbox', { name: /measurable outcome/i });
  await input.fill('Discard only after asking');
  const overview = page.getByRole('link', { name: /^overview$/i });
  await overview.click();
  await expect(page.getByRole('dialog', { name: 'Unsaved changes' })).toBeVisible();
  await page.getByRole('button', { name: 'Keep editing' }).click();
  await expect(page).toHaveURL(/\/expectations\/EXP-1(?:\?|$)/);
  await expect(input).toHaveValue('Discard only after asking');
  await overview.click();
  await page.getByRole('button', { name: 'Discard changes' }).click();
  await expect(page).toHaveURL(/\/products\/PROD-1$/);
  await page.getByRole('button', { name: 'Expand Reliable edits' }).click();
  await page.getByRole('button', { name: 'Edit EXP-2' }).click();
  await page.getByRole('textbox', { name: /measurable outcome/i }).fill('Only second artifact changes');
  const open = page.getByRole('button', { name: /open document/i }).or(page.getByRole('link', { name: /open document/i }));
  await open.click();
  await page.getByRole('button', { name: 'Continue editing', exact: true }).click();
  await expect(page).toHaveURL(/\/expectations\/EXP-2(?:\?|$)/);
  const submitted = page.waitForRequest(request => request.method() === 'PUT' && new URL(request.url()).pathname === '/api/expectations/EXP-2');
  await page.getByRole('button', { name: /save expectation/i }).click();
  expect((await submitted).headers()['if-match']).toBe(revisionB);
  await expect.poll(() => read('expectations/EXP-2.yaml')).toContain('Only second artifact changes');
  expect(await read('expectations/EXP-1.yaml')).toBe(files['expectations/EXP-1.yaml']);
});
