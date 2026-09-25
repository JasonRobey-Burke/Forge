import { test, expect } from './workspace-fixtures';
import type { Page } from '@playwright/test';
function dataset(intentions: number, children: number) {
  const files: Record<string, string> = { 'products/PROD-1.yaml': 'product:\n  id: PROD-1\n  name: Large fixture product\n  status: active\n' };
  for (let i = 1; i <= intentions; i++) {
    files[`intentions/INT-${i}.yaml`] = `intention:\n  id: INT-${i}\n  product: PROD-1\n  statement: Intention ${i}\n  rationale: Reachable large data\n  status: defined\n`;
    for (let j = 1; j <= children; j++) {
      const n = (i - 1) * children + j;
      files[`expectations/EXP-${n}.yaml`] = `expectation:\n  id: EXP-${n}\n  intention: INT-${i}\n  description: Outcome ${n}\n  status: ready\n  edge_cases: []\n`;
      files[`specs/SPEC-${n}.yaml`] = `spec:\n  id: SPEC-${n}\n  product: PROD-1\n  title: Delivery ${n}\n  status: draft\n  expectations: [EXP-${n}]\n  context: { stack: [], patterns: [], conventions: [], auth: "" }\n  validation: {}\n`;
    }
  }
  return files;
}
async function tabTo(page: Page, name: string) {
  const target = page.getByRole('button', { name, exact: true });
  for (let step = 0; step < 400; step++) {
    if (await target.evaluate(element => document.activeElement === element)) return target;
    await page.keyboard.press('Tab');
  }
  await expect(target).toBeFocused();
  return target;
}
test('100 intentions, 1000 expectations and 1000 specs load collapsed without per-row queries', async ({ page, seed }, testInfo) => {
  test.setTimeout(120000); // Fixture creation and checksum polling are included; not a performance SLA.
  await seed(dataset(100, 10));
  const rowRequests: string[] = [];
  page.on('request', request => {
    const url = new URL(request.url());
    if (/^\/api\/(intentions|expectations|specs)\/[^/]+$/.test(url.pathname) && request.method() === 'GET') rowRequests.push(url.pathname);
  });
  const started = performance.now();
  await page.goto('/products/PROD-1/map');
  const tree = page.getByRole('list', { name: 'Product relationships', exact: true });
  await expect(tree).toBeVisible();
  const first = page.getByRole('button', { name: 'Expand Intention 1', exact: true });
  await expect(first).toBeVisible();
  const firstContentMs = performance.now() - started;
  await expect(tree.locator('[aria-expanded="true"]')).toHaveCount(0);
  await expect(page.getByText('Outcome 1', { exact: true })).not.toBeVisible();
  const expanded = performance.now();
  await first.click();
  await expect(page.getByRole('button', { name: /expand.*outcome 1$/i })).toBeVisible();
  const expandMs = performance.now() - expanded;
  expect(rowRequests).toEqual([]);
  const search = page.getByRole('textbox', { name: /search|filter/i });
  await search.fill('Intention 100');
  const lastExpand = page.getByRole('button', { name: 'Expand Intention 100', exact: true });
  const lastCollapse = page.getByRole('button', { name: 'Collapse Intention 100', exact: true });
  await expect(lastExpand.or(lastCollapse)).toBeVisible();
  if (await lastExpand.isVisible()) await lastExpand.click();
  await expect(page.getByRole('button', { name: /^(?:expand|collapse) outcome 1000$/i })).toBeVisible();
  expect(rowRequests).toEqual([]);
  await testInfo.attach('large-data-interactions.json', { body: JSON.stringify({ fixture: { intentions: 100, expectations: 1000, specs: 1000 }, firstContentMs, expandMs, perRowGETs: rowRequests }, null, 2), contentType: 'application/json' });
});
test('paginated children remain reachable by keyboard through Show more', async ({ page, seed }) => {
  await seed(dataset(1, 51));
  await page.goto('/products/PROD-1/map');
  await tabTo(page, 'Expand Intention 1'); await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: /^expand.*outcome /i })).toHaveCount(50);
  const more = page.getByRole('button', { name: /show more/i });
  for (let step = 0; step < 400 && !(await more.evaluate(element => element === document.activeElement)); step++) await page.keyboard.press('Tab');
  await expect(more).toBeFocused(); await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: /^expand.*outcome /i })).toHaveCount(51);
  const last = page.getByRole('button', { name: /^expand.*outcome 51$/i });
  await expect(last).toBeVisible();
  await tabTo(page, await last.getAttribute('aria-label') || await last.innerText());
  await page.keyboard.press('Enter');
  await expect(page.getByRole('link', { name: /delivery 51/i })).toBeVisible();
});
