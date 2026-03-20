# UX Review Backlog

**Generated:** 2026-03-20
**Application:** Forge
**Total Items:** 22

## Summary by Priority

| Priority | Count | Categories |
|----------|-------|------------|
| P0 | 5 | technical-ux, visual-ux |
| P1 | 7 | technical-ux, visual-ux |
| P2 | 6 | technical-ux, visual-ux, persona-driven |
| P3 | 4 | persona-driven |

---

## P0 — Critical (Do This Week)

## [UXRV-001] Add keyboard alternative for Flow Board drag-and-drop

**Category:** technical-ux
**Priority:** P0 (Critical)
**Effort:** M (1-3 days)
**Source:** Technical UX specialist (C1), Marcus persona (blocked)

### Description
The Flow Board uses @dnd-kit with only PointerSensor. Keyboard-only users cannot move specs between phases. This is a WCAG 2.1.1 Level A failure. Add KeyboardSensor to the dnd-kit sensors array and provide a dropdown "Move to phase" menu on each SpecCard as a fallback.

### Acceptance Criteria
- [ ] KeyboardSensor added to FlowBoard DndContext
- [ ] SpecCards are keyboard-focusable (tabindex, role="button")
- [ ] Users can pick up and drop cards using keyboard (Space to grab, arrow keys to move, Space to drop)
- [ ] A "Move to..." dropdown menu exists on each card as an alternative to dragging
- [ ] Screen reader announces drag start/end states

### Related Artifacts
- Persona: Marcus Thompson
- Report: `.ux-review/specialist-reports/technical-ux.md` (C1)

---

## [UXRV-002] Implement semantic phase color system for badges

**Category:** visual-ux
**Priority:** P0 (Critical)
**Effort:** S (< 1 day)
**Source:** Visual UX specialist (C1), all personas

### Description
Phase badges use only 3 shadcn variants for 6 phases, making InProgress/Review/Validating identical (black) and Draft/Done identical (gray). Define distinct colors: Draft=slate, Ready=blue, InProgress=amber, Review=purple, Validating=orange, Done=green. Apply consistently across SpecDetailPage, SpecListPage, SpecCard, and PhaseColumn.

### Acceptance Criteria
- [ ] Each of the 6 phases has a visually distinct badge color
- [ ] Badge colors are consistent across all components (detail, list, board)
- [ ] Colors meet WCAG AA contrast requirements
- [ ] Phase colors defined as CSS custom properties for reuse

### Related Artifacts
- Report: `.ux-review/specialist-reports/visual-ux.md` (C1)
- Mockup: `.ux-review/mockups/02-semantic-phase-badges.html`

---

## [UXRV-003] Add breadcrumbs to all detail pages

**Category:** technical-ux
**Priority:** P0 (Critical)
**Effort:** M (1-3 days)
**Source:** Technical UX specialist (C2), Priya persona, Dana persona

### Description
IntentionDetailPage, ExpectationDetailPage, SpecDetailPage, and FlowBoardPage have no breadcrumb navigation. Users hit dead ends and cannot traverse the Product > Intention > Expectation > Spec hierarchy. Add breadcrumbs showing the full path with clickable links.

### Acceptance Criteria
- [ ] ProductDetailPage shows: Products > [Product Name]
- [ ] IntentionDetailPage shows: Products > [Product Name] > Intentions > [Intention Title]
- [ ] ExpectationDetailPage shows: Products > [Product Name] > [Intention Title] > Expectations > [Expectation Title]
- [ ] SpecDetailPage shows: Products > [Product Name] > Specs > [Spec Title]
- [ ] FlowBoardPage shows: Products > [Product Name] > Flow Board
- [ ] ExpectationListPage breadcrumbs include the product level (currently skipped)

### Related Artifacts
- Persona: Priya Sharma, Dana Kim
- Report: `.ux-review/specialist-reports/technical-ux.md` (C2, M1)

---

## [UXRV-004] Add search and filtering to list pages

**Category:** technical-ux
**Priority:** P0 (High — elevated by user)
**Effort:** L (3-5 days)
**Source:** Technical UX specialist (H2), Alex persona, Dana persona

### Description
No search, filter, or sort capability exists on any list page or the Flow Board. Add text search to the product list, phase/complexity filters to the spec list, and a filter bar on the Flow Board.

### Acceptance Criteria
- [ ] Product list has a text search input that filters by name
- [ ] Spec list has phase filter (dropdown or chips) and complexity filter
- [ ] Flow Board has a text search that highlights matching cards
- [ ] Filters persist during the session (not lost on navigation)

### Related Artifacts
- Persona: Alex Rivera, Dana Kim
- Report: `.ux-review/specialist-reports/technical-ux.md` (H2)

---

## [UXRV-005] Add visual brand identity to header and app

**Category:** visual-ux
**Priority:** P0 (High — elevated by user)
**Effort:** S (< 1 day)
**Source:** Visual UX specialist (H1), user feedback

### Description
The header contains only "Forge" in bold text and a "Products" link. No logo, brand mark, or accent color. Add a simple brand mark, introduce an accent color for the header, and update the primary color to be more distinctive.

### Acceptance Criteria
- [ ] Header has a logo mark or brand icon
- [ ] An accent color is visible in the header/top bar
- [ ] The app has a favicon
- [ ] Primary color updated from near-black to a distinctive hue

### Related Artifacts
- Report: `.ux-review/specialist-reports/visual-ux.md` (H1)
- Mockup: `.ux-review/mockups/01-branded-header-navigation.html`

---

## P1 — High (This Sprint)

## [UXRV-006] Add dynamic page titles

**Category:** technical-ux
**Priority:** P1
**Effort:** S (< 1 day)
**Source:** Technical UX specialist (H3)

### Description
Page title is static "Forge" on all routes (WCAG 2.4.2 failure). Add a `useDocumentTitle` hook to set contextual titles like "SPEC-001: Scaffolding | Forge" and "Flow Board | Forge".

### Acceptance Criteria
- [ ] Each page sets a descriptive document title
- [ ] Title includes the entity name where applicable
- [ ] Title updates on client-side navigation

---

## [UXRV-007] Add skeleton loaders for loading states

**Category:** visual-ux
**Priority:** P1
**Effort:** M (1-3 days)
**Source:** Visual UX specialist (H3), Technical UX specialist (H4)

### Description
Loading states are plain `<div>Loading...</div>` text. Replace with shadcn/ui Skeleton components matching the expected content layout.

### Acceptance Criteria
- [ ] List pages show skeleton card grids during loading
- [ ] Detail pages show skeleton sections matching layout
- [ ] Board page shows skeleton columns
- [ ] Loading containers have `aria-busy="true"`

---

## [UXRV-008] Redesign phase transition buttons

**Category:** technical-ux
**Priority:** P1
**Effort:** M (1-3 days)
**Source:** Technical UX specialist (H1)

### Description
Transition buttons show ALL phases including backward transitions, all with identical styling. Show the next logical phase as a primary button, group backward transitions in a "More" dropdown, and use human-readable labels ("In Progress" not "InProgress").

### Acceptance Criteria
- [ ] Next logical phase is the primary CTA button
- [ ] Backward transitions are in a secondary dropdown with confirmation
- [ ] Phase labels use human-readable format (PHASE_LABELS mapping)
- [ ] Arrow icons replace text "->" arrows

---

## [UXRV-009] Add toast notifications for mutations

**Category:** technical-ux
**Priority:** P1
**Effort:** S (< 1 day)
**Source:** Technical UX specialist (M3)

### Description
No success feedback for create/update/delete operations. Add sonner (via shadcn/ui) for toast notifications.

### Acceptance Criteria
- [ ] Create operations show "Created successfully" toast
- [ ] Update operations show "Saved" toast
- [ ] Delete operations show "Deleted" toast
- [ ] Phase transitions show "Moved to [phase]" toast

---

## [UXRV-010] Redesign product detail page layout

**Category:** visual-ux
**Priority:** P1
**Effort:** M (1-3 days)
**Source:** Visual UX specialist (H2)

### Description
Product detail has 8 equally-weighted cards requiring excessive scrolling. Consolidate into: hero section (name + status), prominent action bar (Intentions/Specs/Board), 2-column content grid, and collapsible context/WIP sections.

### Acceptance Criteria
- [ ] Navigation actions (Intentions, Specs, Board) are prominently positioned at top
- [ ] Short text fields (Vision, Audience) grouped in 2-column layout
- [ ] Context and WIP sections collapsible
- [ ] Page fits above fold on 1080p without scrolling for core info

### Related Artifacts
- Mockup: `.ux-review/mockups/03-product-detail-page-redesign.html`

---

## [UXRV-011] Improve button hierarchy on spec detail page

**Category:** visual-ux
**Priority:** P1
**Effort:** S (< 1 day)
**Source:** Visual UX specialist (H4)

### Description
4 outline buttons compete for attention. Make Edit the primary button, group Export actions in a dropdown, and make the next-phase transition button visually prominent.

### Acceptance Criteria
- [ ] Edit button uses primary variant
- [ ] Export buttons grouped in a single dropdown
- [ ] Next-phase transition is the most prominent CTA in its section
- [ ] Delete remains destructive variant

---

## [UXRV-012] Expand global navigation

**Category:** technical-ux
**Priority:** P1
**Effort:** M (1-3 days)
**Source:** Technical UX specialist (H5)

### Description
Header has only "Forge" and "Products". Add product-scoped navigation when a product is selected (Intentions, Specs, Board links in the header or a secondary nav bar).

### Acceptance Criteria
- [ ] When viewing a product's pages, product name appears in nav
- [ ] Quick links to Intentions, Specs, Board visible without going through product detail
- [ ] Active page is visually indicated in navigation

---

## P2 — Medium (Next Quarter)

## [UXRV-013] Add inline help and IDD onboarding

**Category:** persona-driven
**Priority:** P2
**Effort:** L (3-5 days)
**Source:** Priya persona, walkthroughs

### Description
No explanation of IDD concepts (Intentions, Expectations, Specs) anywhere in the UI. Add tooltips, field descriptions, and an optional onboarding flow for new users.

### Acceptance Criteria
- [ ] Key IDD terms have info tooltips on first appearance
- [ ] Form fields for Boundaries, Deliverables, Validation have help text
- [ ] First-time users see a brief walkthrough or "Getting Started" guide

---

## [UXRV-014] Make Flow Board responsive

**Category:** visual-ux
**Priority:** P2
**Effort:** M (1-3 days)
**Source:** Visual UX specialist (C2)

### Description
Board uses `grid-cols-6` with no breakpoints. Add horizontal scroll at medium widths and stacked list view at small widths.

### Acceptance Criteria
- [ ] Board is horizontally scrollable at viewport < 1200px
- [ ] Board switches to stacked/list view at viewport < 768px
- [ ] Column headers remain visible during scroll

---

## [UXRV-015] Add ARIA live regions for dynamic content

**Category:** technical-ux
**Priority:** P2
**Effort:** M (1-3 days)
**Source:** Technical UX specialist (M4, accessibility audit)

### Description
No `aria-live` regions for checklist updates, phase transition results, or form submission status. Add appropriate ARIA attributes.

### Acceptance Criteria
- [ ] Checklist progress has `role="progressbar"` with aria-value attributes
- [ ] Phase transition success/failure announced via aria-live region
- [ ] Form submission status announced to screen readers

---

## [UXRV-016] Design empty states with CTAs

**Category:** visual-ux
**Priority:** P2
**Effort:** S (< 1 day)
**Source:** Visual UX specialist (M4)

### Description
Empty states are plain text. Add icons, descriptive messaging, and action buttons. Board empty columns should show dashed drop zones.

### Acceptance Criteria
- [ ] Each empty state has an icon, descriptive text, and primary action
- [ ] Board empty columns show dashed-border drop zones with "Drag specs here"

---

## [UXRV-017] Add drag handle affordance to spec cards

**Category:** visual-ux
**Priority:** P2
**Effort:** S (< 1 day)
**Source:** Visual UX specialist (M3)

### Description
Board cards have cursor-grab but no visible drag handle. Add a grip dots icon and hover lift effect.

### Acceptance Criteria
- [ ] Visible grip handle icon on left side of cards
- [ ] Hover state adds shadow lift effect
- [ ] Cards visually distinct from clickable cards elsewhere

---

## [UXRV-018] Replace native alert() and fix cancel navigation

**Category:** technical-ux
**Priority:** P2
**Effort:** S (< 1 day)
**Source:** Technical UX specialist (M2, M6)

### Description
IntentionDetailPage uses `alert()` for errors (only instance). Cancel buttons use `navigate(-1)` which is fragile. Fix both.

### Acceptance Criteria
- [ ] `alert()` replaced with inline error or toast
- [ ] Cancel buttons navigate to deterministic parent page

---

## P3 — Low (Backlog)

## [UXRV-019] Add dashboard / summary metrics

**Category:** persona-driven
**Priority:** P3
**Effort:** L (3-5 days)
**Source:** Dana persona

### Description
No product-level progress overview. Add summary counts, phase distribution chart, and bottleneck indicators.

---

## [UXRV-020] Add user assignment and "my work" view

**Category:** persona-driven
**Priority:** P3
**Effort:** XL (1-2 weeks)
**Source:** Priya persona, Dana persona

### Description
No concept of spec ownership or assignment. Add assignee field and a filtered "My Work" view.

---

## [UXRV-021] Add slide-out spec preview on board

**Category:** persona-driven
**Priority:** P3
**Effort:** M (1-3 days)
**Source:** Alex persona, walkthroughs

### Description
Clicking a board card navigates away. Add a slide-out panel to preview spec details without leaving the board.

---

## [UXRV-022] Add quick-create wizard

**Category:** persona-driven
**Priority:** P3
**Effort:** L (3-5 days)
**Source:** Alex persona, Dana persona, task flow analysis

### Description
Creating a full hierarchy (Product → Intention → Expectation → Spec) requires 12+ page navigations. Add a multi-step wizard for end-to-end creation.
