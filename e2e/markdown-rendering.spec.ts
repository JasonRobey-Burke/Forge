import { test, expect } from '@playwright/test';
import { getProducts, getSpecs, updateSpec } from './helpers';

// Verifies that prose fields render markdown as formatted HTML rather than
// literal markdown source. Covers the Spec Description field (variant="inline")
// as the deterministic, easiest-to-seed site; the same MarkdownRenderer
// component backs all other sites listed in the spec (Product problem_statement/
// vision, Intention/Expectation description, Spec boundaries/deliverables/
// context.auth, and the block-variant Review/Plan content).
//
// NOTE ON FIXTURE STRATEGY: Forge is view+edit only (see CLAUDE.md — creation
// is done by the IDD plugin, deletion by removing YAML files), and there is no
// POST /api/specs or DELETE route in src/server/routes/specs.ts to mint a
// disposable spec the way e2e/helpers.ts's createSpec/deleteEntity imply. This
// test instead borrows whatever Spec already exists in docs/, temporarily PUTs
// a markdown description onto it, asserts the render, then restores the
// original description in afterEach so the fixture is left unchanged.
test.describe('Markdown rendering', () => {
  let specId: string;
  let originalDescription: string;

  test.beforeAll(async () => {
    const products = await getProducts();
    test.skip(products.length === 0, 'No Product fixture in docs/ to locate a Spec on');
    const specs = await getSpecs(products[0].id);
    test.skip(specs.length === 0, 'No Spec fixture in docs/ to seed markdown content onto');
    specId = specs[0].id;
    originalDescription = specs[0].description;
  });

  test.afterEach(async () => {
    if (specId) await updateSpec(specId, { description: originalDescription });
  });

  test('spec description renders markdown formatting, not literal syntax', async ({ page }) => {
    const markdown = [
      'This has **bold** text and a list:',
      '',
      '- item one',
      '- item two',
    ].join('\n');

    await updateSpec(specId, { description: markdown });

    await page.goto(`/specs/${specId}`);

    // Card is a plain div (shadcn/ui), not a heading role, so locate it by its
    // CardTitle text and scope assertions to that Card's subtree.
    const descriptionCard = page.locator('.rounded-lg.border.bg-card', { hasText: 'Description' }).first();

    // Formatting is applied: bold text becomes a <strong>, list items become <li>.
    await expect(descriptionCard.locator('strong', { hasText: 'bold' })).toBeVisible();
    const listItems = descriptionCard.locator('ul li');
    await expect(listItems).toHaveCount(2);
    await expect(listItems.nth(0)).toHaveText('item one');
    await expect(listItems.nth(1)).toHaveText('item two');

    // The literal markdown syntax must not leak through as visible text.
    await expect(descriptionCard).not.toContainText('**bold**');
    await expect(descriptionCard).not.toContainText('- item one');
  });
});
