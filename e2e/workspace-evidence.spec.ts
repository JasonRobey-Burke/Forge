import { test, expect } from './workspace-fixtures';
const files = {
  'products/PROD-1.yaml': 'product:\n  id: PROD-1\n  name: Evidence contract\n',
  'products/PROD-2.yaml': 'product:\n  id: PROD-2\n  name: Other product\n',
  'intentions/INT-1.yaml': 'intention:\n  id: INT-1\n  product: PROD-1\n  statement: Evidence outcome\n',
  'expectations/EXP-1.yaml': 'expectation:\n  id: EXP-1\n  intention: INT-1\n  description: Evidence expectation\n  edge_cases: [One, Two]\n',
  'specs/SPEC-1.yaml': 'spec:\n  id: SPEC-1\n  product: PROD-1\n  title: Completed delivery\n  status: done\n  expectations: [EXP-1]\n  gap_check: { status: passed, blockers: 0, warnings: 0, report: reports/missing-evidence.md }\n  context: { stack: [], patterns: [], conventions: [], auth: "" }\n  validation: {}\n',
  'specs/SPEC-10.yaml': 'spec:\n  id: SPEC-10\n  product: PROD-2\n  title: Other delivery\n  status: done\n  context: { stack: [], patterns: [], conventions: [], auth: "" }\n  validation: {}\n',
};
const report = '# Cycle F source marker\n\nReported result: passed\n\n<img src=x onerror="window.__evidenceExecuted=true"><script>window.__evidenceExecuted=true</script>\n';
test.beforeEach(async ({ seed, write }) => {
  await seed(files);
  await write('reviews/SPEC-1-review.md', report);
  await write('reviews/SPEC-10-review.md', '# Other product private report\n');
  await write('reviews/unassociated-cycle-f.md', '# Global cycle F report\n');
});
test('evidence source preview preserves Markdown and never executes embedded HTML', async ({ page, read }) => {
  const before = await read('specs/SPEC-1.yaml');
  await page.goto('/products/PROD-1/evidence');
  await expect(page.getByText(/SPEC-1-review.md/).first()).toBeVisible();
  await expect(page.getByText(/missing-evidence.md/).first()).toBeVisible();
  await expect(page.getByText(/unknown/i).first()).toBeVisible();
  await expect(page.getByText(/SPEC-10-review.md/)).toHaveCount(0);
  const source = page.getByRole('button', { name: /SPEC-1-review|open.*source|view.*source/i }).or(page.getByRole('link', { name: /SPEC-1-review|open.*source|view.*source/i })).first();
  await source.focus(); await page.keyboard.press('Enter');
  await expect(page.getByText(/Cycle F source marker/).first()).toBeVisible();
  expect(await page.evaluate(() => (window as Window & { __evidenceExecuted?: boolean }).__evidenceExecuted)).toBeUndefined();
  expect(await read('reviews/SPEC-1-review.md')).toBe(report); expect(await read('specs/SPEC-1.yaml')).toBe(before);
});
test('server reads only enumerated product sources and global reports remain discoverable', async ({ page, request }) => {
  const allowed = await request.get('/api/products/PROD-1/evidence', { params: { path: 'reviews/SPEC-1-review.md' } });
  expect(allowed.ok()).toBe(true); expect(await allowed.text()).toContain('Cycle F source marker');
  for (const source of ['reviews/SPEC-10-review.md', 'reviews/unassociated-cycle-f.md', '../outside.md', 'products/PROD-1.yaml']) {
    const denied = await request.get('/api/products/PROD-1/evidence', { params: { path: source } });
    expect(denied.status()).toBeGreaterThanOrEqual(400); expect(denied.status()).toBeLessThan(500);
    expect(await denied.text()).not.toContain('Other product private report');
  }
  await page.goto('/products/PROD-1/evidence');
  await expect(page.locator('a[href="/reviews"]').first()).toBeVisible();
  await expect(page.locator('a[href="/plans"]').first()).toBeVisible();
  await page.locator('a[href="/reviews"]').first().click();
  await expect(page.getByText(/unassociated-cycle-f/).first()).toBeVisible();
});
