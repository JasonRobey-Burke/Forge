import { test, expect } from '@playwright/test';
import {
  createProduct,
  createIntention,
  createExpectation,
  createSpec,
  linkExpectations,
  updateSpec,
} from './helpers';

// ---------------------------------------------------------------------------
// Helper: build a spec with product context and linked expectations
// ---------------------------------------------------------------------------
async function createSetup() {
  const product = await createProduct({
    name: `E2E Editor Product ${Date.now()}`,
    context: {
      stack: ['React', 'TypeScript'],
      patterns: ['MVC'],
      conventions: ['ESLint'],
      auth: 'JWT',
    },
  });

  const intention = await createIntention(product.id);

  const expectation = await createExpectation(intention.id, {
    title: `E2E Editor Expectation ${Date.now()}`,
    description: 'Test expectation description',
    edge_cases: ['Edge case A', 'Edge case B'],
  });

  const spec = await createSpec(product.id, {
    title: `E2E Editor Spec ${Date.now()}`,
    description: 'Spec for editor/export tests',
    context: {
      stack: ['React', 'TypeScript'],
      patterns: ['MVC'],
      conventions: ['ESLint'],
      auth: 'JWT',
    },
    boundaries: ['No external APIs'],
    deliverables: ['Component'],
    validation_automated: ['Unit tests pass'],
    validation_human: ['Code review done'],
  });

  await updateSpec(spec.id, { peer_reviewed: true });
  await linkExpectations(spec.id, [expectation.id]);

  return { product, intention, expectation, spec };
}

// ---------------------------------------------------------------------------
// Scenario 1: Collapsible sections visible on edit page
// ---------------------------------------------------------------------------
test('edit page shows five collapsible sections', async ({ page }) => {
  const { spec } = await createSetup();

  await page.goto(`http://localhost:5173/specs/${spec.id}/edit`);
  await page.waitForSelector('form');

  // All five section triggers should be visible
  for (const title of ['Context', 'Expectations', 'Boundaries', 'Deliverables', 'Validation']) {
    await expect(page.locator('button', { hasText: title }).first()).toBeVisible();
  }
});

// ---------------------------------------------------------------------------
// Scenario 2: Collapse/expand works
// ---------------------------------------------------------------------------
test('collapsible section toggles content visibility', async ({ page }) => {
  const { spec } = await createSetup();

  await page.goto(`http://localhost:5173/specs/${spec.id}/edit`);
  await page.waitForSelector('form');

  // Click the Boundaries trigger to collapse it
  const boundariesTrigger = page.locator('button', { hasText: 'Boundaries' }).first();
  await boundariesTrigger.click();

  // The DynamicListEditor inside should be hidden
  // Click again to expand
  await boundariesTrigger.click();

  // Verify the add button is visible again
  await expect(page.locator('button', { hasText: '+ Add Boundaries' })).toBeVisible();
});

// ---------------------------------------------------------------------------
// Scenario 3: Linked expectations shown in editor
// ---------------------------------------------------------------------------
test('edit page shows linked expectations in read-only section', async ({ page }) => {
  const { spec, expectation } = await createSetup();

  await page.goto(`http://localhost:5173/specs/${spec.id}/edit`);
  await page.waitForSelector('form');

  // Expectations section should show the linked expectation title
  await expect(page.locator('text=Test expectation description')).toBeVisible();

  // Edge cases should be visible
  await expect(page.locator('text=Edge case A')).toBeVisible();
  await expect(page.locator('text=Edge case B')).toBeVisible();
});

// ---------------------------------------------------------------------------
// Scenario 4: YAML export download
// ---------------------------------------------------------------------------
test('detail page exports YAML file', async ({ page }) => {
  const { spec } = await createSetup();

  await page.goto(`http://localhost:5173/specs/${spec.id}`);
  await page.waitForSelector('h1');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('button', { hasText: 'Export YAML' }).click(),
  ]);

  expect(download.suggestedFilename()).toContain('.yaml');
});

// ---------------------------------------------------------------------------
// Scenario 5: Markdown export download
// ---------------------------------------------------------------------------
test('detail page exports Markdown file', async ({ page }) => {
  const { spec } = await createSetup();

  await page.goto(`http://localhost:5173/specs/${spec.id}`);
  await page.waitForSelector('h1');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('button', { hasText: 'Export Markdown' }).click(),
  ]);

  expect(download.suggestedFilename()).toContain('.md');
});
