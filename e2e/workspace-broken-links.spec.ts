import { test, expect } from './workspace-fixtures';

const files = {
  'products/PROD-1.yaml': 'product:\n  id: PROD-1\n  name: Broken relationship product\n  status: active\n',
  'intentions/INT-1.yaml': 'intention:\n  id: INT-1\n  product: PROD-1\n  statement: Preserve missing references\n  status: defined\n  expectations: [EXP-404]\n',
  'expectations/EXP-1.yaml': 'expectation:\n  id: EXP-1\n  intention: INT-1\n  description: Existing measurable outcome\n  status: ready\n  edge_cases: []\n',
};

for (const filtered of [false, true]) {
  test(`missing canonical expectation remains identifiable with its owning intention${filtered ? ' after filtering by its literal ID' : ''}`, async ({ page, seed, read, request }) => {
    test.setTimeout(60000); // Allow each diagnostic assertion and final read-only checks to finish on RED.
    await seed(files);
    const before = Object.fromEntries(await Promise.all(Object.keys(files).map(async relative => [relative, await read(relative)])));
    try {
      await page.goto('/products/PROD-1/map');
      const tree = page.getByRole('list', { name: 'Product relationships', exact: true });
      await expect(tree).toBeVisible();
      await page.getByRole('button', { name: 'Expand Preserve missing references', exact: true }).click();

      if (filtered) await page.getByRole('textbox', { name: 'Filter product map', exact: true }).fill('EXP-404');

      // A literal broken reference must remain visible, with its ancestor and a
      // route to inspect the owning artifact, regardless of diagnostic wording.
      await expect.soft(page.getByText(/\bEXP-404\b/).filter({ visible: true }).first()).toBeVisible();
      await expect.soft(tree.getByRole('button', { name: /^(?:Expand|Collapse) Preserve missing references$/ })).toBeVisible();
      const owner = page.locator('a[href="/intentions/INT-1"], a[href^="/intentions/INT-1?"]').filter({ visible: true }).first();
      await expect.soft(owner).toBeVisible();
      if (await owner.isVisible()) {
        await owner.click();
        await expect(page).toHaveURL(/\/intentions\/INT-1(?:\?|$)/);
      }
    } finally {
      for (const [relative, original] of Object.entries(before)) expect(await read(relative)).toBe(original);
      // Reading and filtering cannot manufacture the missing expectation.
      await expect(read('expectations/EXP-404.yaml')).rejects.toMatchObject({ code: 'ENOENT' });
      expect((await request.get('/api/expectations/EXP-404')).status()).toBe(404);
    }
  });
}
