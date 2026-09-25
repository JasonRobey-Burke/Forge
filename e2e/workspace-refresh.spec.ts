import { test, expect } from './workspace-fixtures';

const files = {
  'products/PROD-1.yaml': 'product:\n  id: PROD-1\n  name: Workspace test product\n  problem_statement: Preserve human work\n  owner: Avery\n  status: active\n',
  'intentions/INT-1.yaml': 'intention:\n  id: INT-1\n  product: PROD-1\n  statement: Reliable edits\n  rationale: Preserve human work\n  priority: high\n  status: defined\n  forge:\n    roadmap: { bucket: now, rank: 1 }\n',
  'expectations/EXP-1.yaml': 'expectation:\n  id: EXP-1\n  intention: INT-1\n  description: Original measurable outcome\n  status: ready\n  edge_cases: [Offline, External change]\n',
};

test.beforeEach(async ({ seed }) => seed(files));

for (const [surface, suffix] of [['Overview', ''], ['Roadmap', '/roadmap'], ['Evidence', '/evidence'], ['Delivery', '/board']] as const) {
  test(`${surface} retains cached content on failed refresh and Retry displays fresh data${surface === 'Overview' ? ' without replacing the dirty draft' : ''}`, async ({ page, write, read }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    const initialResponse = page.waitForResponse(response => new URL(response.url()).pathname === '/api/products/PROD-1/workspace' && response.request().method() === 'GET' && response.ok());
    await page.goto(`/products/PROD-1${suffix}`);
    await initialResponse;
    const cachedName = page.getByText('Workspace test product', { exact: true }).filter({ visible: true }).first();
    const freshName = page.getByText('Workspace refreshed product', { exact: true }).filter({ visible: true }).first();
    await expect(cachedName).toBeVisible();

    const draft = page.getByRole('textbox', { name: /measurable outcome/i });
    if (surface === 'Overview') {
      await page.getByRole('button', { name: 'Expand Reliable edits' }).click();
      await page.getByRole('button', { name: 'Edit EXP-1' }).click();
      await draft.fill('Keep this unsaved outcome through failed refresh and retry');
    }

    let failures = 0;
    let recovering = false;
    await page.route('**/api/products/PROD-1/workspace', async route => {
      if (route.request().method() === 'GET' && !recovering) {
        failures++;
        await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ data: null, error: { message: 'Refresh unavailable' }, meta: {} }) });
      } else await route.continue();
    });
    await write('products/PROD-1.yaml', files['products/PROD-1.yaml'].replace('Workspace test product', 'Workspace refreshed product').replace('owner: Avery', 'owner: Morgan'));
    await expect.poll(() => failures, { timeout: 15_000 }).toBeGreaterThan(0);

    // Permit the normal bounded automatic read retries before requiring actionable stale-state feedback.
    const warning = page.getByText(/refresh.*fail|fail.*refresh|may be stale|out.of.date/i).filter({ visible: true }).first();
    await expect(warning).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Refresh unavailable/i).filter({ visible: true }).first()).toBeVisible();
    const retry = page.getByRole('button', { name: 'Retry', exact: true });
    await expect(retry).toBeVisible();
    await expect(retry).toBeEnabled();
    await expect(cachedName).toBeVisible();
    await expect(freshName).toHaveCount(0);
    if (surface === 'Overview') await expect(draft).toHaveValue('Keep this unsaved outcome through failed refresh and retry');

    recovering = true;
    const freshResponse = page.waitForResponse(response => new URL(response.url()).pathname === '/api/products/PROD-1/workspace' && response.request().method() === 'GET' && response.ok());
    await retry.click();
    await freshResponse;
    await expect(freshName).toBeVisible();
    await expect(warning).toHaveCount(0);
    await expect(page.getByText(/Refresh unavailable/i)).toHaveCount(0);
    await expect(retry).toHaveCount(0);
    if (surface === 'Overview') await expect(draft).toHaveValue('Keep this unsaved outcome through failed refresh and retry');
    expect(await read('expectations/EXP-1.yaml')).toBe(files['expectations/EXP-1.yaml']);
  });
}
