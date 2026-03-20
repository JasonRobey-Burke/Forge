# Technical UX Specialist Report

**Application:** Forge (Spec-Management Tool for Intent-Driven Development)
**Evaluator:** Technical UX Specialist
**Date:** 2026-03-20
**App URL:** http://localhost:5173
**Tech Stack:** React 19, TypeScript, Tailwind CSS, shadcn/ui, @dnd-kit

---

## Evaluation Summary

Forge is a functionally complete spec-management tool with a solid foundation in its use of shadcn/ui components and React Hook Form with Zod validation. The core task flows -- creating products, defining intentions and expectations, authoring specs, and managing phase transitions via the Flow Board -- are all operational. The completeness checklist with its live evaluation during editing is a standout feature that provides immediate, actionable feedback to users.

However, the application has significant navigation and information architecture gaps that create dead ends and disorientation, particularly for users moving between hierarchy levels. Detail pages for Intentions, Expectations, and Specs lack breadcrumb navigation, making it impossible to traverse back up the Product > Intention > Expectation > Spec hierarchy without relying on the browser's back button. The global navigation offers only a single "Products" link, which is insufficient for an application with this depth of hierarchy.

Accessibility compliance is incomplete. While the shadcn/ui components provide a reasonable baseline (form labels, focus rings on buttons), the application has critical gaps: the Flow Board's drag-and-drop has no keyboard alternative, the page title never updates across routes, there are no ARIA live regions for dynamic content, and the checklist uses color-only indicators (green/red) without programmatic role semantics. Pattern consistency is generally good across list and detail pages thanks to the systematic use of shadcn/ui Card and Badge components, though the error handling patterns are inconsistent (native `alert()` in one place, inline messages elsewhere).

---

## Heuristic Scores

| Heuristic | Score (1-5) | Key Issue |
|-----------|-------------|-----------|
| Visibility of system status | 3 | Loading states are minimal plain text; no skeleton loaders; no toast notifications for mutations |
| Match with real world | 4 | IDD terminology (Intentions, Expectations) is domain-appropriate; "InProgress" displayed without space in some places |
| User control & freedom | 2 | No breadcrumbs on detail pages; no undo for deletions; cancel buttons use `navigate(-1)` which is fragile |
| Consistency & standards | 3 | Breadcrumbs present on list pages but absent on detail pages; inconsistent error handling patterns |
| Error prevention | 4 | Zod validation prevents bad submissions; WIP limit checks prevent invalid moves; good defaults provided |
| Recognition over recall | 2 | Users must remember product context when editing specs; no visual hierarchy map; no search |
| Flexibility & efficiency | 2 | No keyboard shortcuts; no bulk actions; no search/filter; no quick-create flows |
| Aesthetic & minimalist design | 4 | Clean layout with good use of cards and spacing; appropriate information density |
| Error recovery | 3 | Form validation is inline; but deletion has no undo; `alert()` used for one error case |
| Help & documentation | 1 | No onboarding, tooltips, help text, or documentation for IDD concepts |

---

## Detailed Findings

### Critical Issues

#### C1: Flow Board Has No Keyboard Alternative for Drag-and-Drop
- **Location:** `/products/:productId/board` (FlowBoard.tsx, SpecCard.tsx)
- **Description:** The Flow Board uses `@dnd-kit` with only a `PointerSensor` configured. The `KeyboardSensor` is not included in the sensors array. SpecCard components use `useDraggable` which applies `listeners` and `attributes` for pointer interaction only. There is no button-based or select-based fallback for moving specs between phases.
- **Impact:** Users who cannot use a mouse (keyboard-only users, screen reader users, users with motor impairments) are completely unable to move specs between phases on the board. This is a WCAG 2.1 Level A failure (2.1.1 Keyboard).
- **Evidence:** `FlowBoard.tsx` line 44-46: `useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))` -- no KeyboardSensor. SpecCard is a `div` with drag listeners, not a button with a keyboard-accessible move action.
- **Recommendation:**
  1. Add `KeyboardSensor` to the dnd-kit sensors array.
  2. Add a context menu or dropdown on each SpecCard with "Move to [Phase]" options as a keyboard-accessible alternative.
  3. Ensure the SpecCard element has `role="button"` and `tabindex="0"` when used in the board context.

#### C2: Detail Pages Lack Breadcrumb Navigation -- Dead Ends in Hierarchy
- **Location:** IntentionDetailPage.tsx, ExpectationDetailPage.tsx, SpecDetailPage.tsx, FlowBoardPage.tsx
- **Description:** The Intention detail page, Expectation detail page, and Spec detail page have NO breadcrumb navigation. The only way to navigate back up the hierarchy is through the browser back button or the global "Products" link. The Spec detail page does not even display which product it belongs to. The Flow Board page has a "Back to Product" button but no breadcrumbs.
- **Impact:** Users lose their place in the hierarchy. The Priya persona explicitly identified "getting lost navigating between entities" as a pain point. A user viewing a spec cannot determine which product, intention, or expectation it belongs to without navigating elsewhere. This violates Nielsen's heuristic of "User control and freedom."
- **Evidence:** Confirmed via live app navigation -- IntentionDetailPage at `/intentions/11000000-...` shows no breadcrumbs in the DOM snapshot. Same for ExpectationDetailPage and SpecDetailPage.
- **Recommendation:**
  1. Add `<Breadcrumbs>` to all detail pages: Product > [Product Name] > Intentions > [Intention Title] for IntentionDetailPage; full chain for Expectations and Specs.
  2. The Spec detail page should show its parent product name and link back to the product.
  3. Add "Back to [parent]" links as a secondary navigation aid.

### High-Severity Issues

#### H1: Phase Transition Buttons Show All Non-Current Phases (Including Backward Transitions from Done)
- **Location:** SpecDetailPage.tsx, lines 102 and 198-212
- **Description:** When a spec is in "Done" phase, the detail page shows buttons to transition to Ready, InProgress, Review, and Validating. The filtering logic is `Object.values(SpecPhaseEnum).filter((p) => p !== 'Draft' && p !== spec.phase)`, which shows ALL phases except Draft and the current one. This means a spec in "Done" can be moved backward to any phase, and a spec in "Review" shows buttons for "Ready" (backward) alongside "Validating" and "Done" (forward).
- **Impact:** Users may accidentally move specs backward in the workflow. There is no visual distinction between forward and backward transitions. The Alex persona expects "a clear flow" and the board metaphor implies forward progression.
- **Evidence:** Live app snapshot of SPEC-001 (phase: Done) shows buttons: "-> Ready", "-> InProgress", "-> Review", "-> Validating".
- **Recommendation:**
  1. Separate forward and backward transitions visually (e.g., forward buttons prominent, backward as a secondary dropdown or with a warning).
  2. Consider requiring confirmation for backward transitions.
  3. Display only the next logical phase as the primary action, with others accessible via a "More transitions" menu.

#### H2: No Search or Filtering Capability Across Any Entity
- **Location:** Global; ProductListPage, IntentionListPage, SpecListPage, FlowBoardPage
- **Description:** There is no search bar, filter controls, or sorting options on any list page or the flow board. With even moderate data (the products list already shows 7 items including E2E test artifacts), finding specific entities requires visual scanning.
- **Impact:** The Alex persona needs to "see all specs across intentions in a single filtered view" for standup sweeps. The Dana persona needs to quickly identify blocked specs. Without search/filter, these core use cases require clicking into every product and scanning every list.
- **Recommendation:**
  1. Add a search/filter bar to the Products list page.
  2. Add phase and complexity filters to the Specs list page.
  3. Add a board-level filter (by phase, complexity, or keyword) on the Flow Board page.
  4. Consider a global search in the header navigation.

#### H3: Page Title Never Updates Across Routes
- **Location:** `index.html` (static title "Forge"), no `document.title` management
- **Description:** The HTML `<title>` is hardcoded to "Forge" and never changes as users navigate between pages. Every route shows "Forge" in the browser tab.
- **Impact:** Users with multiple tabs open cannot distinguish between pages. Screen reader users rely on the page title to understand the current context when a page loads. This is a WCAG 2.1 Level A failure (2.4.2 Page Titled).
- **Evidence:** Browser tab consistently shows "Forge" on all pages tested (products list, product detail, spec detail, flow board, spec edit).
- **Recommendation:** Use `react-helmet-async` or a custom `useDocumentTitle` hook to set the title on each page (e.g., "SPEC-001: Project scaffolding | Forge", "Forge - Flow Board", "Products | Forge").

#### H4: Loading States Are Plain Text With No Visual Indicator
- **Location:** All pages (ProductListPage, IntentionListPage, SpecListPage, SpecDetailPage, FlowBoardPage)
- **Description:** Loading states render as plain `<div className="text-muted-foreground">Loading...</div>` with no spinner, skeleton, or animation. There is no visual progress indicator.
- **Impact:** Users may not recognize the page is loading, especially on slower connections. The muted text is easy to miss. The lack of skeleton loaders causes layout shifts when content loads.
- **Recommendation:**
  1. Replace plain text loading states with skeleton loaders that match the expected content layout.
  2. Add a subtle spinner or progress bar for longer operations.
  3. Consider adding `aria-busy="true"` to loading containers for screen readers.

#### H5: Global Navigation Has Only One Link
- **Location:** Layout.tsx
- **Description:** The global header navigation contains only "Forge" (home link) and "Products". There are no links to recently visited items, no breadcrumb trail at the app level, and no way to quickly access the Flow Board or Specs list for a product.
- **Impact:** Users must always navigate through the product detail page to reach intentions, specs, or the board. This adds unnecessary clicks for power users who check the board multiple times daily (Alex and Dana personas).
- **Recommendation:**
  1. Add a "current product" context in the navigation that shows links to its Intentions, Specs, and Board when a product is selected.
  2. Consider a sidebar navigation for product-scoped views.
  3. At minimum, add breadcrumbs to all pages (see C2).

### Medium-Severity Issues

#### M1: ExpectationListPage Breadcrumbs Skip the Product Level
- **Location:** ExpectationListPage.tsx, lines 19-25
- **Description:** The breadcrumb trail shows: Products > [Intention Title] > Expectations. It skips the Product name entirely, jumping from the Products list directly to the Intention. This is because the code accesses only the Intention data, not the parent Product.
- **Impact:** Users cannot navigate from the Expectations list back to the product without going through multiple hops. The hierarchy is broken in the breadcrumb representation.
- **Evidence:** Code at line 19-25 constructs breadcrumbs without querying for the product.
- **Recommendation:** Fetch the product data (or pass it through context/params) and include it in the breadcrumb chain: Products > [Product Name] > [Intention Title] > Expectations.

#### M2: Native `alert()` Used for Error Handling
- **Location:** IntentionDetailPage.tsx, line 43
- **Description:** When deleting an intention fails (e.g., it has active expectations), the error is shown via `alert(err.message)`. This is the only place in the application that uses native `alert()`. All other error paths use inline error messages or toast patterns.
- **Impact:** The native alert is visually inconsistent, blocks the UI thread, provides no styled feedback, and is difficult to customize or dismiss. Users may be confused by the different error presentation compared to other pages.
- **Recommendation:** Replace `alert()` with an inline error message (consistent with other pages) or a toast notification component (shadcn/ui's Sonner or similar).

#### M3: No Toast/Notification Feedback for Successful Mutations
- **Location:** All create/edit/delete flows
- **Description:** When a user creates, updates, or deletes an entity, the only feedback is a navigation redirect. There is no success toast, banner, or notification confirming the action completed.
- **Impact:** Users lack confirmation that their action succeeded. If the redirect is fast, they may not be sure the operation completed. This is especially important for delete operations where the redirect could be confused with a navigation action.
- **Recommendation:** Add a toast notification system (e.g., `sonner` via shadcn/ui) for all create/update/delete operations. Display messages like "Product created successfully" or "Spec deleted."

#### M4: Checklist Uses Color-Only Pass/Fail Indicators
- **Location:** CompletenessChecklist.tsx, lines 37-38
- **Description:** The checklist items use green (text-green-600) checkmarks and red (text-red-500) X marks to indicate pass/fail. While the symbols (checkmark/X) provide a secondary indicator, the color remains the primary visual differentiator. The progress bar uses only color (bg-primary fill on bg-muted background).
- **Impact:** Users with color vision deficiency may have difficulty distinguishing passed vs. failed items at a glance, especially in the progress bar which has no secondary indicator. Partially meets WCAG 1.4.1 (Use of Color) due to the checkmark/X symbols, but the progress bar fails this criterion.
- **Recommendation:**
  1. Add pattern or icon overlays to the progress bar (e.g., striped pattern for incomplete).
  2. Consider adding explicit "Passed" / "Failed" text labels for screen readers.
  3. Add `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax` to the progress element.

#### M5: Spec Edit Form Section State Not Persisted
- **Location:** SpecForm.tsx, CollapsibleSection.tsx
- **Description:** All collapsible sections (Context, Expectations, Boundaries, Deliverables, Validation) default to `open`. When a user collapses a section they have completed and then submits the form (which triggers a redirect), the section state is lost. There is no memory of which sections were open or closed.
- **Impact:** Users who iteratively edit specs must re-collapse sections each time. For the long Spec form with 6+ collapsible sections, this creates unnecessary visual noise and scrolling.
- **Recommendation:** Persist collapsible state in localStorage keyed to the spec ID, or remember it in session state.

#### M6: Cancel Buttons Use `navigate(-1)` Which Is Fragile
- **Location:** ProductForm.tsx (line 220), IntentionForm.tsx (line 146), SpecForm.tsx (line 326)
- **Description:** All Cancel buttons use `navigate(-1)` (browser back), which goes to whatever page the user came from, not necessarily the expected parent page. If a user opened the form via a direct URL, the back navigation goes to an unrelated page or leaves the app entirely.
- **Impact:** Unpredictable behavior for users who arrive via bookmarks, shared links, or refreshed pages.
- **Recommendation:** Cancel buttons should navigate to a deterministic destination (e.g., the parent list page or detail page) rather than relying on browser history.

#### M7: Product Detail Page Has No Breadcrumbs
- **Location:** ProductDetailPage.tsx
- **Description:** The Product detail page does not include a breadcrumb component. While it is only one level deep (Products > Product Name), the absence breaks the pattern established on list pages.
- **Impact:** Minor inconsistency, but it means the Products list page link is only available via the global nav header, not in the page content area. Combined with C2, this creates a pattern where detail pages systematically lack breadcrumbs.
- **Recommendation:** Add breadcrumbs: Products > [Product Name].

### Low-Severity Issues

#### L1: "InProgress" Displayed Without Space in Badge on Some Pages
- **Location:** IntentionListPage (intention status badge), SpecListPage (phase badge), SpecDetailPage (transition buttons)
- **Description:** The phase value "InProgress" is displayed as-is in some badges and buttons (e.g., "-> InProgress"). The PhaseColumn component in the Flow Board correctly maps it to "In Progress" via `PHASE_LABELS`, but the detail page buttons and list page badges do not.
- **Impact:** Minor visual inconsistency that makes the UI feel unpolished. System-centric labeling rather than user-centric.
- **Recommendation:** Apply a display label mapping consistently across all components, not just the Flow Board.

#### L2: WIP Limit Labels Use Lowercase System Keys
- **Location:** ProductDetailPage.tsx (lines 161-163), ProductForm.tsx (line 204)
- **Description:** WIP limit labels display as "draft", "ready", "in progress" (lowercase, with underscore replaced). This is inconsistent with the title-case used elsewhere in the app (e.g., "Draft", "Ready" on the Flow Board).
- **Impact:** Minor visual inconsistency.
- **Recommendation:** Use title-case labels matching the phase names used on the Flow Board.

#### L3: E2E Test Data Visible in Product List
- **Location:** ProductListPage at `/products`
- **Description:** Five "E2E Editor Product" entries with numeric suffixes are visible in the products list alongside real seed data. These are test artifacts that were not cleaned up.
- **Impact:** Confusing for new users or demo purposes. Not a code issue per se, but indicates soft-delete cleanup or test isolation may need attention.
- **Recommendation:** Ensure E2E tests clean up after themselves, or add a filter to exclude test data in the UI.

#### L4: Timestamps Shown in Locale Format Without Timezone Context
- **Location:** All detail pages (ProductDetailPage, IntentionDetailPage, ExpectationDetailPage, SpecDetailPage)
- **Description:** Timestamps use `toLocaleString()` and `toLocaleDateString()` which display in the user's local format. There is no indication of timezone, and the full datetime format may be overly verbose for some locales.
- **Impact:** Minor. Could cause confusion in distributed teams across timezones.
- **Recommendation:** Use a relative time format (e.g., "2 hours ago") with full datetime on hover tooltip.

#### L5: No Favicon
- **Location:** index.html
- **Description:** No favicon is defined in the HTML head. Browsers show a default or broken icon.
- **Impact:** Minor branding gap.
- **Recommendation:** Add a favicon.

---

## Accessibility Audit Summary

### Perceivable (WCAG Principle 1)

| Criterion | Status | Details |
|-----------|--------|---------|
| 1.1.1 Non-text Content | Partial | No images requiring alt text exist; however, decorative icons (ChevronDown in CollapsibleSection) lack `aria-hidden="true"` |
| 1.3.1 Info and Relationships | Fail | Checklist items lack semantic list structure; progress bar has no ARIA role; form field groupings for Context sections use visual-only headings (h3 without fieldset/legend) |
| 1.4.1 Use of Color | Partial | Checklist uses checkmark/X symbols alongside color, but the progress bar relies on color alone; badge variants (destructive=red, default=dark, secondary=gray) use color to convey status type |
| 1.4.3 Contrast (Minimum) | Pass | shadcn/ui default theme colors meet WCAG AA. `--muted-foreground` (HSL 240 3.8% 46.1%) on white background computes to approximately 4.6:1, passing AA for normal text but borderline |
| 1.4.11 Non-text Contrast | Pass | Focus rings at 2px with ring color provide sufficient contrast against backgrounds |

### Operable (WCAG Principle 2)

| Criterion | Status | Details |
|-----------|--------|---------|
| 2.1.1 Keyboard | **Fail** | Flow Board drag-and-drop has no keyboard alternative (Critical); SpecCard `div` with drag listeners is not keyboard-navigable for move operations |
| 2.1.2 No Keyboard Trap | Pass | No keyboard traps detected; dialogs properly manage focus and can be dismissed with Escape |
| 2.4.1 Bypass Blocks | Fail | No skip-to-content link; repeated header navigation on every page with no way to bypass |
| 2.4.2 Page Titled | **Fail** | Page title is static "Forge" on all routes |
| 2.4.3 Focus Order | Pass | Tab order follows DOM order; form fields are logically ordered |
| 2.4.6 Headings and Labels | Partial | Pages use h1 headings; form labels are properly associated via shadcn/ui FormField; but section headings within forms (h3 "Context", "WIP Limits") are not associated with their field groups |
| 2.4.7 Focus Visible | Pass | shadcn/ui provides `focus-visible:ring-2` styles on all interactive elements |
| 2.5.5 Target Size | Pass | Buttons use h-10 (40px) minimum; touch targets are adequate at desktop scale |

### Understandable (WCAG Principle 3)

| Criterion | Status | Details |
|-----------|--------|---------|
| 3.1.1 Language of Page | Pass | `<html lang="en">` is set |
| 3.3.1 Error Identification | Pass | Form validation messages appear inline below fields with descriptive text |
| 3.3.2 Labels or Instructions | Partial | Form inputs have labels; but the purpose of fields like "Boundaries" and "Deliverables" is not explained (no help text or examples) |
| 3.3.3 Error Suggestion | Pass | Zod validation messages suggest the required action (e.g., "Name is required") |

### Robust (WCAG Principle 4)

| Criterion | Status | Details |
|-----------|--------|---------|
| 4.1.2 Name, Role, Value | Partial | shadcn/ui components provide good ARIA attributes for forms and dialogs; but Badge components are `<div>` elements with no semantic role and no programmatic meaning for status indicators; SpecCard on the board has `button` role via dnd-kit attributes but the click action (navigate to detail) is mixed with drag behavior |
| 4.1.3 Status Messages | Fail | No `aria-live` regions for: phase transition success/failure, form submission success, loading state changes, or checklist updates during editing |

---

## Task Flow Analysis

### Flow 1: Create Product > Add Intention > Add Expectation > Create Spec > Move to Ready

**Steps (minimum):**
1. Navigate to `/products` (1 click or direct URL)
2. Click "New Product" (1 click)
3. Fill out product form (6 fields + context + WIP limits)
4. Click "Create Product" -> redirects to product list (1 click)
5. Click newly created product card to view detail (1 click)
6. Click "View Intentions" (1 click)
7. Click "New Intention" (1 click)
8. Fill intention form (4 fields)
9. Click "Create Intention" -> redirects to intentions list (1 click)
10. Click newly created intention card (1 click)
11. Click "View All" expectations (1 click)
12. Click "New Expectation" (1 click)
13. Fill expectation form (3 fields + edge cases)
14. Click "Create Expectation" -> redirects to expectations list (1 click)
15. Navigate back to product (via Products link, 2 clicks minimum)
16. Click "View Specs" (1 click)
17. Click "New Spec" (1 click)
18. Fill spec form (Title, Description, Context auto-inherited, Boundaries, Deliverables, Validation sections)
19. Click "Create Spec" -> redirects to specs list (1 click)
20. Click newly created spec to view detail (1 click)
21. NOTE: Cannot link expectations from here -- no UI for linking
22. Click "Transition to Ready" (1 click)
23. If checklist incomplete, override dialog appears

**Total steps:** ~20 clicks + significant form entry
**Total pages navigated:** 12+

**Friction Points:**
- **Step 4:** Product create redirects to list, not to the detail page. User must find and click the newly created product again. Should redirect to the product detail page.
- **Steps 15-16:** Navigating from expectations back to the product's specs requires going through the global Products link because there are no breadcrumbs on the expectation detail/list pages.
- **Step 21:** There is no UI mechanism to link expectations to a spec. The SpecForm shows "No expectations linked. Link expectations from the spec detail page after creating." but the Spec detail page also has no linking UI. This is a critical workflow gap.
- **Overall:** The forced hierarchy traversal (must create Product, then Intention, then Expectation before Spec) is 12+ pages of navigation. Alex's deal-breaker was "if creating a spec requires me to first create product, intention, expectation..."

**Recommendations:**
1. Redirect create flows to the detail page of the newly created entity, not the list page.
2. Add expectation-linking UI to the Spec detail or edit page.
3. Consider a "Quick Create" wizard that chains Product > Intention > Expectation > Spec in a single multi-step flow.
4. Ensure breadcrumbs are present on all pages to allow efficient hierarchy traversal.

### Flow 2: Daily Board Review (Dana Persona)

**Steps:**
1. Navigate to `/products` (1 click)
2. Click product card (1 click)
3. Click "View Board" (1 click)
4. Scan columns for spec counts and phase distribution
5. Click a spec card to view details (1 click)
6. Click browser back to return to board (1 click)

**Total steps:** 3 clicks to reach board, +2 per spec inspection

**Friction Points:**
- No way to bookmark or quick-access the board without going through the product detail page first.
- Board has no summary counts (total specs, blocked count, average days in phase).
- No filter by assignee (no assignment feature exists yet).
- Clicking a spec card navigates away from the board; inspecting a spec and returning requires browser back.

**Recommendations:**
1. Add the board link directly in the global nav when a product is selected.
2. Add a summary row at the top of the board showing total specs and aggregate stats.
3. Consider a slide-out panel for spec details to avoid navigating away from the board.

### Flow 3: Export Spec for AI Consumption (Alex Persona)

**Steps:**
1. Navigate to spec detail page (3+ clicks from products list)
2. Click "Export YAML" or "Export Markdown" (1 click)
3. File downloads automatically

**Total steps:** 4+ clicks

**Friction Points:**
- Export is only available from the Spec detail page, not from the list or board view.
- No batch export for multiple specs.
- Token count badge (">8K tokens") appears only on the Markdown export button, which is useful but could also show the actual count.

**Recommendations:**
1. Add export options to the spec list page (per-card action or bulk select).
2. Show the estimated token count prominently on the spec detail page.
3. Consider a "Copy to clipboard" option alongside file download.

---

## Cross-Reference with Persona Observations

| Persona Concern | Finding | Status |
|----------------|---------|--------|
| Alex: "Can I drag specs between phases without losing my place?" | Clicking a card navigates away from the board | **Confirmed issue** (Flow 2) |
| Alex: "Board as control panel, not just a view" | Board has no filters, no summary stats | **Confirmed issue** (H2) |
| Alex: "Single-click export" | Export works with one click from detail page | **Addressed** |
| Alex: "Context inheritance from product" | New specs inherit product context; context diff badge shows modifications | **Addressed well** |
| Marcus: "Can I move specs between phases without using the mouse?" | No keyboard alternative for drag-and-drop | **Critical failure** (C1) |
| Marcus: "Are WIP limit badges readable at 150% zoom?" | Badges use text, not just color; should be readable at zoom | **Likely OK** |
| Marcus: "Does the completeness checklist have proper focus management?" | No ARIA roles on checklist; no live region for updates | **Partial failure** (M4) |
| Priya: "How do I get back to the product from a spec page?" | No breadcrumbs on spec detail page | **Critical failure** (C2) |
| Priya: "Why can't I move this spec to Ready? What's missing?" | Checklist clearly shows failing items | **Addressed well** |
| Dana: "Can I see a summary of how many specs are in each phase?" | Board shows counts per column but no summary row | **Partially addressed** |
| Dana: "Quickest way to set up a new product with all the hierarchy?" | No wizard or quick-create flow; 12+ page traversals | **Not addressed** |
