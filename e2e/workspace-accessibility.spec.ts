import { test, expect } from './workspace-fixtures';
import type { Page, Locator } from '@playwright/test';
const files = {
  'products/PROD-1.yaml': 'product:\n  id: PROD-1\n  name: Accessible product\n  status: active\n',
  'intentions/INT-1.yaml': 'intention:\n  id: INT-1\n  product: PROD-1\n  statement: Reliable edits\n  rationale: Preserve work\n  status: defined\n',
  'expectations/EXP-1.yaml': 'expectation:\n  id: EXP-1\n  intention: INT-1\n  description: Original outcome\n  status: ready\n  edge_cases: []\n',
};
// Native Tab traversal: the bound prevents an inaccessible target from hanging the suite.
async function tabTo(page: Page, target: Locator) {
  for (let index = 0; index < 120; index++) {
    if (await target.evaluate(element => element === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  await expect(target).toBeFocused();
}
test.beforeEach(async ({ seed }) => seed(files));
test('native keyboard reaches navigation, expands rows, traps editor focus and restores it after dirty escape', async ({ page }) => {
  await page.goto('/products/PROD-1');
  const roadmap = page.getByRole('link', { name: /^roadmap$/i });
  await tabTo(page, roadmap); await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/roadmap$/);
  const overview = page.getByRole('link', { name: /^overview$/i });
  await tabTo(page, overview); await page.keyboard.press('Enter');
  const expand = page.getByRole('button', { name: 'Expand Reliable edits' });
  await expect(expand).toHaveAttribute('aria-expanded', 'false');
  await tabTo(page, expand); await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Collapse Reliable edits' })).toHaveAttribute('aria-expanded', 'true');
  const edit = page.getByRole('button', { name: 'Edit EXP-1' });
  await tabTo(page, edit); await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toHaveCount(1);
  const input = page.getByRole('textbox', { name: /measurable outcome/i });
  await tabTo(page, input); await input.fill('Keyboard draft');
  for (const key of ['Tab', 'Shift+Tab']) {
    for (let index = 0; index < 24; index++) {
      await page.keyboard.press(key);
      expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
    }
  }
  await page.keyboard.press('Escape');
  const confirmation = page.getByRole('dialog', { name: 'Unsaved changes' });
  await expect(confirmation).toBeVisible();
  const keep = page.getByRole('button', { name: 'Keep editing' });
  await tabTo(page, keep); await page.keyboard.press('Enter');
  await expect(input).toHaveValue('Keyboard draft');
  await page.keyboard.press('Escape');
  const discard = page.getByRole('button', { name: 'Discard changes' });
  await tabTo(page, discard); await page.keyboard.press('Enter');
  await expect(edit).toBeFocused();
});
for (const width of [1440, 1024, 390]) {
  test(`editor actions and stacked narrow roadmap remain reachable at ${width}px with reduced motion`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/products/PROD-1/roadmap');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width === 390) {
      const boxes = await Promise.all(['Now', 'Next', 'Later', 'Unscheduled'].map(name => page.getByRole('heading', { name, exact: true }).boundingBox()));
      expect(boxes.every(Boolean)).toBe(true);
      for (let i = 1; i < boxes.length; i++) expect(boxes[i]!.y).toBeGreaterThan(boxes[i - 1]!.y);
    }
    await page.getByRole('link', { name: /^overview$/i }).click();
    await page.getByRole('button', { name: 'Expand Reliable edits' }).click();
    await page.getByRole('button', { name: 'Edit EXP-1' }).click();
    await page.getByRole('textbox', { name: /measurable outcome/i }).fill('Long draft '.repeat(100));
    await expect(page.getByRole('button', { name: /save expectation/i })).toBeInViewport();
    await expect(page.getByRole('button', { name: /^cancel$/i })).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width === 390) {
      const editor = await page.getByRole('dialog').boundingBox();
      expect(editor).not.toBeNull();
      expect(editor!.width).toBeGreaterThanOrEqual(width - 2);
    }
  });
}
test('required-field error is associated with its labelled input and announced', async ({ page }) => {
  await page.goto('/products/PROD-1');
  await page.getByRole('button', { name: 'Expand Reliable edits' }).click();
  await page.getByRole('button', { name: 'Edit EXP-1' }).click();
  const input = page.getByRole('textbox', { name: /measurable outcome/i });
  await input.fill('');
  await page.getByRole('button', { name: /save expectation/i }).click();
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  const associated = await input.evaluate(element => {
    const ids = (element.getAttribute('aria-errormessage') || element.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    return ids.map(id => document.getElementById(id)?.textContent || '').join(' ');
  });
  expect(associated.trim().length).toBeGreaterThan(0);
  await expect(page.getByRole('alert')).toBeVisible();
});
