import { test, expect } from '@playwright/test';
import {
  createProduct,
  createIntention,
  createExpectation,
  createSpec,
  deleteEntity,
  linkExpectations,
  updateSpec,
  transitionSpec,
} from './helpers';

// ---------------------------------------------------------------------------
// Helper: build a "fully complete" spec that passes all 11 checklist criteria
// ---------------------------------------------------------------------------
async function createCompleteSetup() {
  const product = await createProduct({
    name: `E2E Checklist Product ${Date.now()}`,
    context: {
      stack: ['React'],
      patterns: ['MVC'],
      conventions: ['ESLint'],
      auth: 'JWT',
    },
  });

  const intention = await createIntention(product.id, {
    title: `E2E Checklist Intention ${Date.now()}`,
  });

  const expectation = await createExpectation(intention.id, {
    title: `E2E Checklist Expectation ${Date.now()}`,
    description: 'Has validation criteria',
    edge_cases: ['Edge case 1', 'Edge case 2'],
  });

  const spec = await createSpec(product.id, {
    title: `E2E Complete Spec ${Date.now()}`,
    description: 'A fully complete spec for checklist tests',
    context: {
      stack: ['React'],
      patterns: ['MVC'],
      conventions: ['ESLint'],
      auth: 'JWT',
    },
    boundaries: ['No external APIs'],
    deliverables: ['Component'],
    validation_automated: ['Unit tests pass'],
    validation_human: ['Code review done'],
  });

  // peer_reviewed is not on createSpecSchema, so set it via update
  await updateSpec(spec.id, { peer_reviewed: true });

  await linkExpectations(spec.id, [expectation.id]);

  return { product, intention, expectation, spec };
}

// ---------------------------------------------------------------------------
// Scenario 1: Checklist displays on spec detail with failures shown
// ---------------------------------------------------------------------------
test.describe('Completeness Checklist — bare spec shows failures', () => {
  let productId: string;
  let specId: string;

  test.beforeAll(async () => {
    const product = await createProduct({ name: `E2E Bare Spec Product ${Date.now()}` });
    productId = product.id;
    const spec = await createSpec(productId, { title: `E2E Bare Spec ${Date.now()}` });
    specId = spec.id;
  });

  test.afterAll(async () => {
    await deleteEntity('products', productId);
  });

  test('checklist panel is visible with failure marks', async ({ page }) => {
    await page.goto(`/specs/${specId}`);
    await expect(page.getByText('Completeness Checklist')).toBeVisible();
    // At least one ✗ should appear for a bare spec
    await expect(page.locator('text=✗').first()).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Scenario 2: Checklist shows all passing (11/11)
// ---------------------------------------------------------------------------
test.describe('Completeness Checklist — fully complete spec shows all passing', () => {
  let productId: string;
  let specId: string;

  test.beforeAll(async () => {
    const setup = await createCompleteSetup();
    productId = setup.product.id;
    specId = setup.spec.id;
  });

  test.afterAll(async () => {
    await deleteEntity('products', productId);
  });

  test('shows 11/11 and Ready for transition', async ({ page }) => {
    await page.goto(`/specs/${specId}`);
    await expect(page.getByText('11/11')).toBeVisible();
    await expect(page.getByText('Ready for transition')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Scenario 3: Draft→Ready blocked when incomplete (override dialog appears)
// ---------------------------------------------------------------------------
test.describe('Completeness Checklist — Draft→Ready blocked when incomplete', () => {
  let productId: string;
  let specId: string;

  test.beforeAll(async () => {
    const product = await createProduct({ name: `E2E Blocked Product ${Date.now()}` });
    productId = product.id;
    const spec = await createSpec(productId, { title: `E2E Blocked Spec ${Date.now()}` });
    specId = spec.id;
  });

  test.afterAll(async () => {
    await deleteEntity('products', productId);
  });

  test('clicking Transition to Ready opens override dialog with Checklist Incomplete title', async ({ page }) => {
    await page.goto(`/specs/${specId}`);
    await page.getByRole('button', { name: 'Transition to Ready' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Checklist Incomplete')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Scenario 4: Draft→Ready succeeds when complete
// ---------------------------------------------------------------------------
test.describe('Completeness Checklist — Draft→Ready succeeds when complete', () => {
  let productId: string;
  let specId: string;

  test.beforeAll(async () => {
    const setup = await createCompleteSetup();
    productId = setup.product.id;
    specId = setup.spec.id;
  });

  test.afterAll(async () => {
    await deleteEntity('products', productId);
  });

  test('phase changes to Ready after clicking Transition to Ready', async ({ page }) => {
    await page.goto(`/specs/${specId}`);
    await page.getByRole('button', { name: 'Transition to Ready' }).click();
    // Badge should now show "Ready" — scope to the header area
    await expect(page.getByRole('heading').locator('..').getByText('Ready')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Scenario 5: Draft→Ready with override reason
// ---------------------------------------------------------------------------
test.describe('Completeness Checklist — Draft→Ready with override', () => {
  let productId: string;
  let specId: string;

  test.beforeAll(async () => {
    const product = await createProduct({ name: `E2E Override Product ${Date.now()}` });
    productId = product.id;
    const spec = await createSpec(productId, { title: `E2E Override Spec ${Date.now()}` });
    specId = spec.id;
  });

  test.afterAll(async () => {
    await deleteEntity('products', productId);
  });

  test('can override and transition with a reason', async ({ page }) => {
    await page.goto(`/specs/${specId}`);
    await page.getByRole('button', { name: 'Transition to Ready' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Checklist Incomplete')).toBeVisible();
    await dialog.getByPlaceholder('Override reason (optional)').fill('Approved by stakeholder for early release');
    await dialog.getByRole('button', { name: 'Override and Transition' }).click();
    // After transition the dialog closes and the Badge shows Ready (scope to header)
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByRole('heading').locator('..').getByText('Ready')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Scenario 6: Non-gated transitions are free (Ready → InProgress)
// ---------------------------------------------------------------------------
test.describe('Completeness Checklist — non-gated transitions are free', () => {
  let productId: string;
  let specId: string;

  test.beforeAll(async () => {
    const setup = await createCompleteSetup();
    productId = setup.product.id;
    specId = setup.spec.id;
    // Transition to Ready via API so we start from a non-Draft phase
    await transitionSpec(specId, 'Ready');
  });

  test.afterAll(async () => {
    await deleteEntity('products', productId);
  });

  test('can transition from Ready to InProgress without checklist gate', async ({ page }) => {
    await page.goto(`/specs/${specId}`);
    // Phase transition buttons should be visible (non-Draft UI)
    await page.getByRole('button', { name: /Move to In Progress/i }).click();
    await expect(page.getByText('InProgress')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Scenario 7: Real-time checklist on edit page
// ---------------------------------------------------------------------------
test.describe('Completeness Checklist — real-time updates on edit page', () => {
  let productId: string;
  let specId: string;

  test.beforeAll(async () => {
    const product = await createProduct({ name: `E2E Edit Checklist Product ${Date.now()}` });
    productId = product.id;
    // Create spec with empty context so the stack criterion fails
    const spec = await createSpec(productId, {
      title: `E2E Edit Checklist Spec ${Date.now()}`,
      context: { stack: [], patterns: [], conventions: [], auth: '' },
    });
    specId = spec.id;
  });

  test.afterAll(async () => {
    await deleteEntity('products', productId);
  });

  test('checklist updates live as context stack is filled in', async ({ page }) => {
    await page.goto(`/specs/${specId}/edit`);

    // The checklist should be visible and show the stack criterion as failing
    await expect(page.getByText('Completeness Checklist')).toBeVisible();
    await expect(page.getByText('✗').first()).toBeVisible();

    // Click "+ Add Stack" to add a stack input field
    await page.getByRole('button', { name: '+ Add Stack' }).click();

    // Fill the new stack input (placeholder is "Stack item")
    const stackInput = page.getByPlaceholder('Stack item').first();
    await stackInput.fill('React');

    // The checklist should now show a green ✓ for "Context: stack is non-empty"
    await expect(page.getByText('✓').first()).toBeVisible();
  });
});
