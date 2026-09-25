import { test, expect } from './workspace-fixtures';
const files = {
  'products/PROD-1.yaml': 'product:\n  id: PROD-1\n  name: Workspace test product\n  problem_statement: Preserve human work\n  owner: Avery\n  status: active\n',
  'intentions/INT-1.yaml': 'intention:\n  id: INT-1\n  product: PROD-1\n  statement: Reliable edits\n  rationale: Preserve human work\n  priority: high\n  status: defined\n  forge:\n    roadmap: { bucket: now, rank: 1 }\n',
  'expectations/EXP-1.yaml': 'expectation:\n  id: EXP-1\n  intention: INT-1\n  description: Original measurable outcome\n  status: ready\n  edge_cases: [Offline, External change]\n',
  'specs/SPEC-1.yaml': 'spec:\n  id: SPEC-1\n  product: PROD-1\n  title: Save implementation\n  status: draft\n  expectations: [EXP-1]\n  context: { stack: [], patterns: [], conventions: [], auth: "" }\n  validation: {}\n',
};
test.beforeEach(async ({ seed }) => { await seed(files); });
for (const width of [1440, 390]) {
  test(`expand, edit, save, reload and keyboard focus at ${width}px`, async ({ page, read }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/products/PROD-1');
    await page.getByRole('button', { name: 'Expand Reliable edits' }).click();
    const edit = page.getByRole('button', { name: 'Edit EXP-1' });
    await edit.focus(); await page.keyboard.press('Enter');
    const input = page.getByRole('textbox', { name: /measurable outcome/i });
    await expect(input).toBeVisible();
    await input.fill(`Saved outcome ${width}`);
    await expect(page.getByRole('button', { name: /save expectation/i })).toBeInViewport();
    await expect(page.getByRole('button', { name: /^cancel$/i })).toBeInViewport();
    await page.getByRole('button', { name: /save expectation/i }).click();
    await expect.poll(() => read('expectations/EXP-1.yaml')).toContain(`Saved outcome ${width}`);
    if (await input.isVisible()) await page.getByRole('button', { name: /^cancel$/i }).click();
    await expect(edit).toBeFocused();
    await page.reload();
    const expand = page.getByRole('button', { name: 'Expand Reliable edits' });
    const collapse = page.getByRole('button', { name: 'Collapse Reliable edits' });
    await expect(expand.or(collapse)).toBeVisible();
    if (await expand.isVisible()) await expand.click();
    else await expect(collapse).toBeVisible();
    await page.getByRole('button', { name: 'Edit EXP-1' }).click();
    await expect(page.getByRole('textbox', { name: /measurable outcome/i })).toHaveValue(`Saved outcome ${width}`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}
test('external filesystem edits retain dirty text and offer compare, copy and protected reload', async ({ page, write }) => {
  await page.goto('/products/PROD-1');
  await page.getByRole('button', { name: 'Expand Reliable edits' }).click();
  await page.getByRole('button', { name: 'Edit EXP-1' }).click();
  const input = page.getByRole('textbox', { name: /measurable outcome/i });
  await input.fill('Unsaved local draft');
  await write('expectations/EXP-1.yaml', files['expectations/EXP-1.yaml'].replace('Original measurable outcome', 'External outcome'));
  await expect(page.getByText('File changed outside Forge')).toBeVisible();
  await expect(input).toHaveValue('Unsaved local draft');
  await expect(page.getByRole('button', { name: /compare/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /copy.*draft/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /force.*(save|overwrite)/i })).toHaveCount(0);
  await page.getByRole('button', { name: /reload/i }).click();
  await expect(page.getByRole('dialog', { name: 'Unsaved changes' })).toBeVisible();
  await page.getByRole('button', { name: 'Keep editing' }).click();
  await expect(input).toHaveValue('Unsaved local draft');
  await page.getByRole('button', { name: /reload/i }).click();
  await page.getByRole('button', { name: 'Discard changes' }).click();
  await expect(input).toHaveValue('External outcome');
});
test('failed save retains draft and retry persists it', async ({ page, read }) => {
  await page.goto('/products/PROD-1');
  await page.getByRole('button', { name: 'Expand Reliable edits' }).click();
  await page.getByRole('button', { name: 'Edit EXP-1' }).click();
  const input = page.getByRole('textbox', { name: /measurable outcome/i });
  await input.fill('Retry this outcome');
  let attempts = 0;
  await page.route('**/api/expectations/EXP-1', async route => {
    if (route.request().method() === 'PUT' && attempts++ === 0) return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ data: null, error: { message: 'Temporary failure' } }) });
    await route.continue();
  });
  await page.getByRole('button', { name: /save expectation/i }).click();
  await expect(input).toHaveValue('Retry this outcome');
  await expect(page.getByRole('button', { name: /save expectation/i })).toBeEnabled();
  await page.getByRole('button', { name: /save expectation/i }).click();
  await expect.poll(() => read('expectations/EXP-1.yaml')).toContain('Retry this outcome');
});
test('successful save in another local page notifies the dirty editor without replacing its draft', async ({ page, context, read }) => {
  await page.goto('/products/PROD-1');
  await page.getByRole('button', { name: 'Expand Reliable edits' }).click();
  await page.getByRole('button', { name: 'Edit EXP-1' }).click();
  const firstDraft = page.getByRole('textbox', { name: /measurable outcome/i });
  await firstDraft.fill('Keep first page draft');
  const secondPage = await context.newPage();
  try {
    await secondPage.goto('/products/PROD-1');
    await secondPage.getByRole('button', { name: 'Expand Reliable edits' }).click();
    await secondPage.getByRole('button', { name: 'Edit EXP-1' }).click();
    await secondPage.getByRole('textbox', { name: /measurable outcome/i }).fill('Committed by second page');
    await secondPage.getByRole('button', { name: /save expectation/i }).click();
    await expect.poll(() => read('expectations/EXP-1.yaml')).toContain('Committed by second page');
    await expect(page.getByText('File changed outside Forge')).toBeVisible();
    await expect(firstDraft).toHaveValue('Keep first page draft');
  } finally {
    await secondPage.close();
  }
});
