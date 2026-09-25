import { test, expect } from './workspace-fixtures';
import { stringify } from 'yaml';
import { createHash } from 'node:crypto';

// Supplemental UI contracts: existing workspace suites own editing, conflicts,
// lifecycle gates, broken links, phase drilldowns, accessibility and scale.
const files: Record<string, string> = {};
const records = {
  products: [{ id: 'PROD-1', name: 'Honest workspace', status: 'active' }],
  intentions: [
    { id: 'INT-1', product: 'PROD-1', statement: 'First outcome', status: 'defined' },
    { id: 'INT-2', product: 'PROD-1', statement: 'Direct only outcome', status: 'defined' },
    { id: 'INT-3', product: 'PROD-1', statement: 'Completed unplanned', status: 'fulfilled' },
    { id: 'INT-4', product: 'PROD-1', statement: 'Archived planned', status: 'defined', archived_at: '2026-01-01', forge: { roadmap: { bucket: 'later', rank: 1 } } },
    { id: 'INT-5', product: 'PROD-1', statement: 'Unsupported planning', status: 'defined', forge: { custom: 'keep', roadmap: { bucket: 'future', rank: 1 } } },
  ],
  expectations: [
    { id: 'EXP-1', intention: 'INT-1', description: 'Reported outcome', status: 'validated' },
    { id: 'EXP-2', intention: 'INT-1', description: 'Completed outcome', status: 'done' },
    { id: 'EXP-3', intention: 'INT-2', description: 'Uncovered outcome', status: 'fulfilled' },
  ],
  specs: [
    { id: 'SPEC-1', product: 'PROD-1', title: 'Shared completed delivery', status: 'done', expectations: ['EXP-1', 'EXP-2'], context: {}, validation: {} },
    { id: 'SPEC-2', product: 'PROD-1', title: 'Direct delivery', status: 'done', intentions: ['INT-2'], context: {}, validation: {} },
  ],
};
for (const [directory, entries] of Object.entries(records)) {
  for (const record of entries) files[`${directory}/${record.id}.yaml`] = stringify({ [directory.slice(0, -1)]: record });
}

test.beforeEach(async ({ seed, write, request }) => {
  // The standard seed waits on detail GETs, which intentionally exclude archived
  // records. Verify this record through the workspace that retains archives.
  const archivedPath = 'intentions/INT-4.yaml';
  await seed(Object.fromEntries(Object.entries(files).filter(([relative]) => relative !== archivedPath)));
  await write(archivedPath, files[archivedPath]);
  const revision = `"${createHash('sha256').update(files[archivedPath]).digest('hex')}"`;
  await expect.poll(async () => {
    const response = await request.get('/api/products/PROD-1/workspace');
    const { data } = await response.json();
    return data.intentions.find((record: { data: { id: string } }) => record.data.id === 'INT-4')?.source.revision;
  }).toBe(revision);
});

test('reported validation stays distinct from Done, Fulfilled and direct intention coverage', async ({ page, read }) => {
  await page.goto('/products/PROD-1');
  await expect(page.getByRole('link', { name: /Expectation coverage/ })).toContainText('2 of 3');
  await expect(page.getByRole('link', { name: /Spec delivery/ })).toContainText('2 of 2 Done');
  const validation = page.getByRole('link', { name: /Reported validation/ });
  await expect(validation).toContainText('1 reported validated');
  await validation.click();
  const supporting = page.getByRole('region', { name: 'Supporting records', exact: true });
  await expect(supporting.locator('a[href^="/expectations/"]')).toHaveCount(1);
  await expect(supporting.getByRole('link', { name: /EXP-1/ })).toContainText('Reported validated · evidence unknown');
  await page.getByRole('link', { name: /Expectation coverage/ }).click();
  await expect(supporting.getByRole('link', { name: /EXP-3/ })).toContainText('No linked spec');

  await page.goto('/products/PROD-1/map');
  await page.getByRole('button', { name: 'Expand Direct only outcome', exact: true }).click();
  await page.getByRole('button', { name: 'Expand Uncovered outcome', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Direct intention-to-spec links · do not establish expectation coverage' })).toBeVisible();
  await expect(page.getByRole('list', { name: 'INT-2 direct spec links', exact: true }).getByRole('link', { name: /SPEC-2/ })).toBeVisible();
  await expect(page.getByRole('list', { name: 'INT-2 expectations', exact: true })).toContainText('No linked spec');
  for (const [relative, original] of Object.entries(files)) expect(await read(relative)).toBe(original);
});

test('filtering for a shared spec retains every matching expectation and its outcome ancestor', async ({ page, read }) => {
  await page.goto('/products/PROD-1/map');
  const filter = page.getByRole('textbox', { name: 'Filter product map', exact: true });
  await filter.fill('SPEC-1');
  const tree = page.getByRole('list', { name: 'Product relationships', exact: true });
  await expect(tree.getByRole('button', { name: 'Collapse First outcome', exact: true })).toBeVisible();
  for (const id of ['EXP-1', 'EXP-2']) {
    await expect(tree.getByRole('list', { name: `${id} specs`, exact: true }).getByRole('link', { name: 'SPEC-1 · Shared completed delivery', exact: true })).toBeVisible();
  }
  await expect(tree.getByRole('button', { name: /Direct only outcome/ })).toHaveCount(0);
  await expect(page.getByText(/2 unique active specs · 2 of 3 active expectations linked/)).toBeVisible();
  await page.reload();
  await expect(filter).toHaveValue('SPEC-1');
  await expect(tree.getByRole('link', { name: 'SPEC-1 · Shared completed delivery', exact: true })).toHaveCount(2);
  expect(await read('specs/SPEC-1.yaml')).toBe(files['specs/SPEC-1.yaml']);
});

test('roadmap filters retain recorded placement and cancelling unsupported replacement preserves exact source', async ({ page, read }) => {
  await page.goto('/products/PROD-1/roadmap');
  await expect(page.getByRole('link', { name: 'Completed unplanned', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Archived planned', exact: true })).toHaveCount(0);
  await page.getByRole('checkbox', { name: 'Show completed', exact: true }).check();
  await expect(page.getByRole('region', { name: 'Unscheduled', exact: true }).getByRole('link', { name: 'Completed unplanned', exact: true })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Show archived', exact: true }).check();
  await expect(page.getByRole('region', { name: 'Later', exact: true }).getByRole('link', { name: 'Archived planned', exact: true })).toBeVisible();
  await expect(page.getByText('Unsupported planning metadata is preserved in the source.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Replace planning metadata', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Confirm replacement', exact: true })).toBeVisible();
  expect(await read('intentions/INT-5.yaml')).toBe(files['intentions/INT-5.yaml']);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Confirm replacement', exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('Unsupported planning metadata is preserved in the source.', { exact: true })).toBeVisible();
  for (const [relative, original] of Object.entries(files)) expect(await read(relative)).toBe(original);
});

test('expectation review rejects blank and duplicate cases and edits require renewed explicit confirmation', async ({ page, read, request }) => {
  const posts: string[] = [];
  page.on('request', request => { if (request.method() === 'POST') posts.push(request.url()); });
  await page.goto('/products/PROD-1');
  await page.getByRole('button', { name: 'Expand First outcome', exact: true }).click();
  await page.getByRole('button', { name: 'New expectation', exact: true }).click();
  await page.getByRole('textbox', { name: 'Measurable outcome', exact: true }).fill('Measured response');
  await page.getByRole('textbox', { name: 'Validation criteria', exact: true }).fill('Observe 100 requests');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('textbox', { name: 'Owner', exact: true }).fill('Avery');
  const confirmation = page.getByRole('checkbox', { name: 'I confirm these edge cases', exact: true });
  await confirmation.check();
  await page.getByRole('button', { name: 'Review draft', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Edge cases:');
  await expect(page.getByRole('button', { name: 'Create draft', exact: true })).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Edge case 1', exact: true }).fill('Offline');
  await page.getByRole('textbox', { name: 'Edge case 2', exact: true }).fill('Offline');
  await confirmation.check();
  await page.getByRole('button', { name: 'Review draft', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Edge cases must be distinct');
  await page.getByRole('textbox', { name: 'Edge case 2', exact: true }).fill('Empty input');
  await expect(confirmation).not.toBeChecked();
  await page.getByRole('button', { name: 'Review draft', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Edge case confirmation:');
  await expect(page.getByRole('textbox', { name: 'Edge case 1', exact: true })).toHaveValue('Offline');
  await expect(page.getByRole('textbox', { name: 'Edge case 2', exact: true })).toHaveValue('Empty input');
  await confirmation.check();
  await page.getByRole('button', { name: 'Review draft', exact: true }).click();
  const review = page.getByRole('dialog');
  for (const text of ['Status: Draft', 'Measured response', 'Observe 100 requests', 'Offline', 'Empty input']) await expect(review.getByText(text, { exact: true })).toBeVisible();
  await expect(review.getByRole('button', { name: 'Create draft', exact: true })).toBeEnabled();
  expect(posts).toEqual([]);
  expect(await read('intentions/INT-1.yaml')).toBe(files['intentions/INT-1.yaml']);
  expect((await request.get('/api/expectations/EXP-4')).status()).toBe(404);
});
