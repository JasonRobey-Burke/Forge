import { test, expect } from './workspace-fixtures';
import { parse } from 'yaml';

const files = {
  'products/PROD-1.yaml': 'product:\n  id: PROD-1\n  name: Accessible review product\n  status: active\n',
  'intentions/INT-1.yaml': 'intention:\n  id: INT-1\n  product: PROD-1\n  statement: Reliable edits\n  rationale: Preserve work\n  status: defined\n  forge:\n    roadmap: { bucket: now, rank: 1024 }\n',
  'expectations/EXP-1.yaml': 'expectation:\n  id: EXP-1\n  intention: INT-1\n  description: Original outcome\n  status: ready\n  edge_cases: [Offline, External change]\n',
  'specs/SPEC-1.yaml': 'spec:\n  id: SPEC-1\n  product: PROD-1\n  title: Reviewed delivery\n  status: done\n  expectations: [EXP-1]\n  context: { stack: [], patterns: [], conventions: [], auth: "" }\n  validation: {}\n',
};

test.beforeEach(async ({ seed }) => seed(files));

test('workspace route transitions identify the product and current view in the document title', async ({ page }) => {
  await page.goto('/products/PROD-1');
  await expect(page).toHaveTitle(/Accessible review product/i);
  await expect(page).toHaveTitle(/Overview/i);
  for (const view of ['Product map', 'Roadmap', 'Evidence', 'Overview']) {
    await page.getByRole('link', { name: view, exact: true }).click();
    await expect(page).toHaveTitle(/Accessible review product/i);
    await expect(page).toHaveTitle(new RegExp(view, 'i'));
  }
});

test('cancelling pristine creation restores focus to its connected opener', async ({ page }) => {
  await page.goto('/products/PROD-1');
  const opener = page.getByRole('button', { name: /new intention/i });
  await opener.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: /^cancel$/i }).click();
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test('closing an evidence preview restores focus to its connected source control', async ({ page, write }) => {
  await write('reviews/SPEC-1-review.md', '# Accessible source preview\n');
  await page.goto('/products/PROD-1/evidence');
  const opener = page.getByRole('button', { name: /SPEC-1-review|open.*source|view.*source/i })
    .or(page.getByRole('link', { name: /SPEC-1-review|open.*source|view.*source/i })).first();
  await opener.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/Accessible source preview/)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test('returning from a nested dirty confirmation restores its initiating parent control', async ({ page }) => {
  await page.goto('/products/PROD-1');
  await page.getByRole('button', { name: 'Expand Reliable edits' }).click();
  await page.getByRole('button', { name: 'Edit EXP-1' }).click();
  const input = page.getByRole('textbox', { name: /measurable outcome/i });
  await input.fill('Preserved keyboard draft');
  const cancel = page.getByRole('button', { name: /^cancel$/i });
  await cancel.focus();
  await page.keyboard.press('Enter');
  const confirmation = page.getByRole('dialog', { name: 'Unsaved changes' });
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole('button', { name: 'Keep editing' }).focus();
  await page.keyboard.press('Enter');
  await expect(confirmation).toHaveCount(0);
  await expect(input).toHaveValue('Preserved keyboard draft');
  await expect(cancel).toBeFocused();
});

test('moving an intention retains focus on its move control after the roadmap refetch', async ({ page, read }) => {
  await page.goto('/products/PROD-1/roadmap');
  const move = page.getByRole('combobox', { name: 'Move INT-1', exact: true });
  const refetched = page.waitForResponse(response => response.request().method() === 'GET'
    && /\/api\/products\/PROD-1\/workspace(?:\?|$)/.test(response.url()));
  await move.focus();
  await move.selectOption({ label: 'Next' });
  await expect.poll(async () => parse(await read('intentions/INT-1.yaml')).intention.forge.roadmap.bucket).toBe('next');
  expect((await refetched).ok()).toBe(true);
  await expect(move).toHaveValue('next');
  await expect(move).toBeFocused();
  expect(parse(await read('intentions/INT-1.yaml')).intention.status).toBe('defined');
  expect(await read('specs/SPEC-1.yaml')).toBe(files['specs/SPEC-1.yaml']);
});

test('reduced motion disables dialog movement animations when opening an editor', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/products/PROD-1');
  await page.getByRole('button', { name: 'Expand Reliable edits' }).click();
  await page.getByRole('button', { name: 'Edit EXP-1' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const animation = await dialog.evaluate(element => {
    const style = getComputedStyle(element);
    return { names: style.animationName.split(',').map(value => value.trim()), durations: style.animationDuration.split(',').map(value => parseFloat(value)) };
  });
  // No named animation may retain a positive duration under reduced motion.
  expect(animation.names.every((name, index) => name === 'none'
    || animation.durations[index % animation.durations.length] === 0)).toBe(true);
});

test('keeping a dirty document handoff here restores focus to Open document in the original editor', async ({ page }) => {
  await page.goto('/products/PROD-1');
  await page.getByRole('button', { name: 'Expand Reliable edits' }).click();
  await page.getByRole('button', { name: 'Edit EXP-1' }).click();
  const editor = page.getByRole('dialog', { name: 'Edit expectation', exact: true });
  const input = editor.getByRole('textbox', { name: /measurable outcome/i });
  await input.fill('Preserved handoff draft');
  const originalURL = page.url();
  const opener = editor.getByRole('button', { name: /open document/i })
    .or(editor.getByRole('link', { name: /open document/i }));
  await opener.focus();
  await page.keyboard.press('Enter');
  const keep = page.getByRole('button', { name: 'Keep here', exact: true });
  await expect(keep).toBeVisible();
  await keep.focus();
  await page.keyboard.press('Enter');
  await expect(keep).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await expect(editor).toBeVisible();
  await expect(input).toHaveValue('Preserved handoff draft');
  await expect(page).toHaveURL(originalURL);
  await expect(opener).toBeFocused();
});
