import { test, expect } from './workspace-fixtures';
import type { Locator, Page } from '@playwright/test';
import { parse } from 'yaml';
import { reviewCreationDraft } from './helpers';

const files = {
  'products/PROD-1.yaml': 'product:\n  id: PROD-1\n  name: Pending safety product\n  status: active\n',
  'intentions/INT-1.yaml': 'intention:\n  id: INT-1\n  product: PROD-1\n  statement: Preserve captured drafts\n  rationale: Prevent lost edits\n  status: defined\n',
  'expectations/EXP-1.yaml': 'expectation:\n  id: EXP-1\n  intention: INT-1\n  description: Original outcome\n  status: ready\n  edge_cases: [Offline, Empty input]\n',
  'expectations/EXP-2.yaml': 'expectation:\n  id: EXP-2\n  intention: INT-1\n  description: Second outcome\n  status: ready\n  edge_cases: [Offline, Empty input]\n',
  'specs/SPEC-1.yaml': 'spec:\n  id: SPEC-1\n  product: PROD-1\n  title: Original spec title\n  status: draft\n  expectations: [EXP-1]\n  context: { stack: [], patterns: [], conventions: [], auth: "" }\n  validation: {}\n',
};
async function holdWrite(page: Page, pathname: string, method = 'PUT') {
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  let requests = 0;
  let responses = 0;
  page.on('response', response => {
    if (new URL(response.url()).pathname === pathname && response.request().method() === method) responses++;
  });
  await page.route(`**${pathname}`, async route => {
    if (route.request().method() === method) { requests++; await held; }
    await route.continue();
  });
  return {
    started: () => expect.poll(() => requests).toBe(1),
    count: () => requests,
    finish: async () => {
      release();
      if (requests > 0) await expect.poll(() => responses).toBeGreaterThan(0);
    },
  };
}
async function refuseFieldChange(field: Locator, captured: string) {
  await expect(field).toBeVisible();
  if (await field.isEditable()) await field.fill('This edit must not replace a pending payload');
  await expect(field).toHaveValue(captured);
}
async function refuseAction(page: Page, action: Locator, capturedURL: string, assertCaptured: () => Promise<void>) {
  await expect(action).toBeVisible();
  if (await action.isEnabled()) await action.click();
  // If a surface asks for confirmation, even explicit discard/handoff must remain protected.
  for (const name of ['Discard changes', 'Continue editing']) {
    const confirm = page.getByRole('button', { name, exact: true });
    if (await confirm.isVisible() && await confirm.isEnabled()) await confirm.click();
  }
  await expect(page).toHaveURL(capturedURL);
  await assertCaptured();
}
function cancel(page: Page) {
  return page.getByRole('button', { name: /^cancel(?: yaml)?$/i }).or(page.getByRole('link', { name: /^cancel(?: yaml)?$/i }));
}
test.beforeEach(async ({ seed }) => seed(files));

test('pending side-editor save preserves its captured draft and refuses cancel, document handoff and source navigation', async ({ page, read }) => {
  await page.goto('/products/PROD-1');
  await page.getByRole('button', { name: 'Expand Preserve captured drafts' }).click();
  await page.getByRole('button', { name: 'Edit EXP-1' }).click();
  const editor = page.getByRole('dialog', { name: 'Edit expectation', exact: true });
  const input = editor.getByRole('textbox', { name: /measurable outcome/i });
  const captured = 'Captured side-editor outcome';
  await input.fill(captured);
  const originalURL = page.url();
  const gate = await holdWrite(page, '/api/expectations/EXP-1');
  try {
    await editor.getByRole('button', { name: /save expectation/i }).click();
    await gate.started();
    await expect(editor.getByRole('button', { name: /save expectation|saving/i })).toBeVisible();
    await expect(editor.getByRole('button', { name: /save expectation|saving/i })).toBeDisabled();
    await refuseFieldChange(input, captured);
    const capturedDraft = async () => { await expect(editor).toBeVisible(); await expect(input).toHaveValue(captured); };
    await refuseAction(page, cancel(page), originalURL, capturedDraft);
    await refuseAction(page, editor.getByRole('button', { name: /open document/i }).or(editor.getByRole('link', { name: /open document/i })), originalURL, capturedDraft);
    await refuseAction(page, editor.getByRole('link', { name: 'Advanced source', exact: true }), originalURL, capturedDraft);
    expect(gate.count()).toBe(1);
  } finally { await gate.finish(); }
  await expect.poll(async () => parse(await read('expectations/EXP-1.yaml')).expectation.description).toBe(captured);
});

test('pending YAML save refuses source edits and cancellation until the captured source commits', async ({ page, read }) => {
  await page.goto('/specs/SPEC-1');
  await page.getByRole('button', { name: /edit yaml/i }).or(page.getByRole('link', { name: /edit yaml/i })).click();
  const input = page.getByRole('textbox', { name: /^yaml source$/i });
  const captured = files['specs/SPEC-1.yaml'].replace('Original spec title', 'Captured YAML title');
  await input.fill(captured);
  const originalURL = page.url();
  const gate = await holdWrite(page, '/api/docs/raw/specs/SPEC-1');
  try {
    await page.getByRole('button', { name: /save yaml/i }).click();
    await gate.started();
    await expect(page.getByRole('button', { name: /save yaml|saving/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /save yaml|saving/i })).toBeDisabled();
    await refuseFieldChange(input, captured);
    await refuseAction(page, cancel(page), originalURL, async () => { await expect(input).toHaveValue(captured); });
    expect(gate.count()).toBe(1);
  } finally { await gate.finish(); }
  await expect.poll(async () => parse(await read('specs/SPEC-1.yaml')).spec.title).toBe('Captured YAML title');
});

test('pending full-page spec save refuses title edits and navigation away from the captured form', async ({ page, read }) => {
  await page.goto('/specs/SPEC-1/edit');
  const input = page.getByRole('textbox', { name: /^title$/i });
  const captured = 'Captured full-page title';
  await input.fill(captured);
  const originalURL = page.url();
  const gate = await holdWrite(page, '/api/specs/SPEC-1');
  try {
    await page.getByRole('button', { name: /save spec|save changes/i }).click();
    await gate.started();
    await expect(page.getByRole('button', { name: /save spec|save changes|saving/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /save spec|save changes|saving/i })).toBeDisabled();
    await refuseFieldChange(input, captured);
    const capturedDraft = async () => { await expect(input).toHaveValue(captured); };
    await refuseAction(page, cancel(page), originalURL, capturedDraft);
    await refuseAction(page, page.getByRole('link', { name: 'Overview', exact: true }), originalURL, capturedDraft);
    expect(gate.count()).toBe(1);
  } finally { await gate.finish(); }
  await expect.poll(async () => parse(await read('specs/SPEC-1.yaml')).spec.title).toBe(captured);
});

test('pending creation protects reviewed draft and recovery controls until successful creation', async ({ page, request, read }) => {
  await page.goto('/products');
  await page.getByRole('row', { name: /Pending safety product/i }).click();
  await expect(page).toHaveURL(/\/products\/PROD-1$/);
  await page.getByRole('button', { name: /new intention/i }).click();
  await reviewCreationDraft(page, 'intention');
  await expect(page.getByText(/Status: Draft/i)).toBeVisible();
  const originalURL = page.url();
  const gate = await holdWrite(page, '/api/intentions', 'POST');
  const createdResponse = page.waitForResponse(response => new URL(response.url()).pathname === '/api/intentions' && response.request().method() === 'POST');
  try {
    await page.getByRole('button', { name: /create draft/i }).click();
    await gate.started();
    const submit = page.getByRole('button', { name: /create draft|creating|saving/i });
    await expect(submit).toBeVisible(); await expect(submit).toBeDisabled();
    const capturedDraft = async () => {
      await expect(page.getByText('New intentional outcome', { exact: true })).toBeVisible();
      await expect(page.getByText(/Status: Draft/i)).toBeVisible();
    };
    await refuseAction(page, cancel(page), originalURL, capturedDraft);
    const back = page.getByRole('button', { name: /^back$|^edit draft$|^review draft$/i });
    if (await back.isVisible()) await refuseAction(page, back, originalURL, capturedDraft);
    const overview = page.getByRole('link', { name: 'Overview', exact: true });
    if (await overview.isVisible()) await refuseAction(page, overview, originalURL, capturedDraft);
    else await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(originalURL);
    await capturedDraft();
    await page.goBack();
    await expect(page).toHaveURL(originalURL);
    await capturedDraft();
    const discard = page.getByRole('button', { name: 'Discard changes', exact: true });
    if (await discard.isVisible()) await expect(discard).toBeDisabled();
    expect(gate.count()).toBe(1);
  } finally { await gate.finish(); }
  const response = await createdResponse;
  expect(response.status()).toBe(201);
  const created = await response.json();
  const committed = parse(await read(`intentions/${created.data.id}.yaml`)).intention;
  expect(committed).toMatchObject({ statement: 'New intentional outcome', rationale: 'Reduce rework', status: 'draft', product: 'PROD-1' });
  expect((await request.get(`/api/intentions/${created.data.id}`)).ok()).toBe(true);
});

test('pending Manage links save refuses changed selection and cancel until captured links commit', async ({ page, read }) => {
  await page.goto('/specs/SPEC-1');
  await page.getByRole('button', { name: 'Manage links', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Manage links', exact: true });
  const first = dialog.getByRole('checkbox', { name: /EXP-1/ });
  const second = dialog.getByRole('checkbox', { name: /EXP-2/ });
  await expect(first).toBeChecked(); await second.check();
  const originalURL = page.url();
  const gate = await holdWrite(page, '/api/specs/SPEC-1');
  try {
    await dialog.getByRole('button', { name: 'Save links', exact: true }).click();
    await gate.started();
    await expect(dialog.getByRole('button', { name: /save links|saving/i })).toBeVisible();
    await expect(dialog.getByRole('button', { name: /save links|saving/i })).toBeDisabled();
    if (await first.isEnabled()) await first.uncheck();
    if (await second.isEnabled()) await second.uncheck();
    await expect(first).toBeChecked(); await expect(second).toBeChecked();
    await refuseAction(page, dialog.getByRole('button', { name: 'Cancel', exact: true }), originalURL, async () => {
      await expect(dialog).toBeVisible(); await expect(first).toBeChecked(); await expect(second).toBeChecked();
    });
    expect(gate.count()).toBe(1);
  } finally { await gate.finish(); }
  await expect.poll(async () => [...parse(await read('specs/SPEC-1.yaml')).spec.expectations].sort()).toEqual(['EXP-1', 'EXP-2']);
});
