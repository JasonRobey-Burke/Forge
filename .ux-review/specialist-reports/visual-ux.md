# Visual UX Specialist Report

## Design Quality Overview

Forge is a functional application built on a solid technical foundation using shadcn/ui and Tailwind CSS. The component library provides a clean baseline, but the application has not moved beyond the defaults into a polished, branded experience. Every page uses the same card-based layout with identical visual weight for all sections, resulting in flat information hierarchy where nothing draws the eye to what matters most. The overall impression is of a well-structured prototype that has not yet received dedicated design attention.

The most significant visual issue is the lack of semantic color coding throughout the application. Phase badges (Draft, Ready, InProgress, Review, Validating, Done) use only three shadcn badge variants, making three phases visually identical (all black "default" badges) and two more indistinguishable (both light gray "secondary" badges). This is a critical usability gap for a Kanban-style workflow tool where phase identification should be instant. Product status badges have a similar problem, where "Active" appears as a solid black pill -- the same style used for "InProgress," "Review," and "Validating" on specs.

The application also lacks visual identity. The header contains only the word "Forge" in bold text with a single "Products" navigation link. There is no logo, brand mark, color accent, or distinguishing visual element. Combined with the default shadcn color palette (grayscale primary with no accent color), the application feels generic. The content density is generally too low -- the Product Detail page, for example, uses eight separate cards stacked vertically for information that could be presented in half the space with proper grouping and layout.

## Visual Design Scores

| Dimension | Score (1-5) | Key Issue |
|-----------|-------------|-----------|
| Visual Hierarchy | 2 | Flat structure -- all cards have equal visual weight; CTAs not differentiated from secondary actions |
| Typography | 3 | Adequate but generic; shadcn defaults are readable but lack character |
| Color & Contrast | 2 | No semantic color system; phase badges are indistinguishable; monochromatic palette |
| Spacing & Layout | 3 | Consistent 4px grid via Tailwind, but excessive whitespace and low density on detail pages |
| Consistency | 3 | shadcn components are internally consistent; some inconsistencies in badge usage patterns |
| Responsive Design | 2 | Flow Board uses a hard `grid-cols-6` with no breakpoint adaptation; detail pages constrained to max-w-3xl |

## Detailed Findings

### Critical Issues

#### C1: Phase badges are visually indistinguishable
- **Location:** SpecDetailPage, SpecListPage, SpecCard, PhaseColumn, FlowBoard
- **Description:** The `phaseVariant` mapping assigns identical visual styles to multiple phases: InProgress, Review, and Validating all use `'default'` (solid black background). Draft and Done both use `'secondary'` (light gray). Ready uses `'outline'` (white with border). This means 3 of 6 phases look identical, and 2 more look identical.
- **Evidence:** In `SpecDetailPage.tsx` lines 28-35:
  ```tsx
  const phaseVariant: Record<SpecPhase, 'default' | 'secondary' | 'outline' | 'destructive'> = {
    Draft: 'secondary',
    Ready: 'outline',
    InProgress: 'default',
    Review: 'default',
    Validating: 'default',
    Done: 'secondary',
  };
  ```
- **Impact:** Users cannot identify spec phase at a glance. On the Flow Board, the badge in the column header is the only phase indicator on spec cards, but it shows count/limit, not the phase name. If a card is dragged or viewed in a list, its phase is unrecognizable from the badge color.
- **Recommendation:** Implement semantic phase colors: Draft=slate, Ready=blue, InProgress=amber, Review=purple, Validating=orange, Done=green. Extend the badge component with custom variants or use className overrides. See mockup `02-semantic-phase-badges.html`.

#### C2: Flow Board does not adapt to smaller viewports
- **Location:** `FlowBoard.tsx` line 115
- **Description:** The board uses `grid grid-cols-6 gap-3` with no responsive breakpoints. On screens narrower than approximately 1200px, columns compress below their `min-w-[200px]` constraint causing horizontal overflow. The column headers clip text (visible in screenshot: "0/5" overlapping "Ready"). There is no mobile-friendly alternative layout.
- **Evidence:** The screenshot shows column headers with WIP count badges overlapping phase names at viewport widths around 900px. The "No specs in this phase" text is truncated.
- **Impact:** The Flow Board is the primary workflow management view but is unusable on tablets and mobile devices. Even on smaller laptop screens (1366px), the columns are cramped.
- **Recommendation:** At medium breakpoints (md), switch to a horizontally scrollable container with snapping. At small breakpoints (sm), switch to a stacked list view with phase headers. Add `overflow-x-auto` as an immediate improvement.

### High-Severity Issues

#### H1: No visual brand identity
- **Location:** `Layout.tsx`, global header
- **Description:** The header contains only the text "Forge" in bold and a single "Products" link. There is no logo, icon, color accent, or other visual element to establish brand identity. The primary color (`--primary: 240 5.9% 10%`) is near-black, giving the entire app a monochromatic appearance.
- **Impact:** The application looks like a developer prototype rather than a finished product. Users noted it "looks generic/unfinished." A tool for managing structured specs should project professionalism and intentionality.
- **Recommendation:** Add a simple brand mark (gradient square with "F" or anvil icon), introduce a subtle accent color for the top bar or primary actions, and update `--primary` to a more distinctive hue (e.g., a blue or indigo). See mockup `01-branded-header-navigation.html`.

#### H2: Product Detail page has low information density and flat hierarchy
- **Location:** `ProductDetailPage.tsx`
- **Description:** The page renders 8 separate cards in a single column (max-w-3xl), each with a CardHeader and CardContent for content that is often a single sentence. Problem Statement, Vision, and Target Audience are each in their own card, wasting vertical space. Navigation cards (Intentions, Specs, Flow Board) look identical to content cards, burying the primary navigation actions.
- **Impact:** Users must scroll extensively to see all product information. The navigation to key features (Flow Board, Specs) is de-emphasized. The page does not communicate information hierarchy -- a one-line "Vision" card has the same visual weight as the multi-section "Context" card.
- **Recommendation:** Consolidate related fields into grouped sections. Promote navigation actions into a prominent action bar at the top. Use a 2-column grid for shorter fields. See mockup `03-product-detail-page-redesign.html`.

#### H3: Loading states are unstyled text
- **Location:** All pages (ProductListPage, ProductDetailPage, SpecDetailPage, FlowBoardPage, etc.)
- **Description:** Loading states render as plain `<div className="text-muted-foreground">Loading...</div>` or `Loading products...`. There are no skeleton loaders, spinners, or visual indicators of loading progress.
- **Evidence:** Every page component follows this pattern. For example, `ProductListPage.tsx` line 19: `return <div className="text-muted-foreground">Loading products...</div>;`
- **Impact:** During data fetching, the page shows a small gray text string in the upper-left corner. This creates a jarring transition from empty to loaded content, and on slower connections the user sees a mostly blank page with no indication of what is happening.
- **Recommendation:** Implement skeleton card loaders for list pages (shimmer rectangles matching card dimensions). For detail pages, use skeleton sections matching the expected layout. shadcn/ui provides a Skeleton component that can be used directly.

#### H4: Primary and secondary button hierarchy unclear on Spec Detail Page
- **Location:** `SpecDetailPage.tsx` lines 114-143
- **Description:** The spec detail page header contains 4 buttons in a row: Export YAML (outline), Export Markdown (outline), Edit (outline), Delete (destructive). All export and edit buttons use the same `variant="outline"` style, giving them equal visual weight. Below the header, phase transition buttons (`"-> Ready"`, `"-> InProgress"`, etc.) also use outline variant but in a smaller size.
- **Impact:** Users cannot quickly identify the primary action. The most common action on a spec detail page (editing or transitioning the spec) has the same visual prominence as less-frequent actions (exporting). The transition buttons, which drive the core workflow, are visually subordinate to the header buttons.
- **Recommendation:** Make the primary action (Edit or the current phase transition) use the default/primary button style. Group export buttons together with a dropdown or secondary styling. Phase transition buttons should be more prominent, possibly with the next logical phase highlighted as primary.

### Medium-Severity Issues

#### M1: WIP limit values display with quoted numbers
- **Location:** `ProductDetailPage.tsx` lines 159-166
- **Description:** WIP limit values display as `"5"`, `"3"`, etc. with quotation marks visible, suggesting the values are being rendered as strings rather than numbers. The WIP limit labels show raw object keys (`draft`, `ready`, `in progress`) in lowercase with basic `capitalize` CSS, resulting in inconsistent casing.
- **Evidence:** Visible in the snapshot: `paragraph [ref=e131]: "5"` with quotes. The `capitalize` class only capitalizes the first letter of each word but `in_progress` becomes "in progress" after `replace('_', ' ')` which then capitalizes to "In progress" (only first word).
- **Impact:** Minor but unprofessional appearance. The quoted numbers and inconsistent capitalization detract from polish.
- **Recommendation:** Ensure WIP limit values are rendered as numbers (not stringified JSON). Use a proper label mapping (e.g., `{ in_progress: 'In Progress' }`) instead of string manipulation.

#### M2: Transition buttons show raw enum values
- **Location:** `SpecDetailPage.tsx` lines 198-212
- **Description:** Phase transition buttons display text like `"-> InProgress"` and `"-> Validating"` using the raw enum value rather than a human-friendly label. The `->` arrow is a plain text character, not a proper arrow icon.
- **Impact:** "InProgress" is a code identifier, not a user-facing label. Users would expect "In Progress." The arrow character is inconsistent with the rest of the UI which does not use emoji or special characters for icons.
- **Recommendation:** Use the `PHASE_LABELS` mapping from `PhaseColumn.tsx` to convert enum values to display names. Replace the text arrow with a Lucide icon (e.g., `ArrowRight` or `ChevronRight`).

#### M3: Spec cards on Flow Board lack visual affordance for dragging
- **Location:** `SpecCard.tsx`
- **Description:** Spec cards on the Flow Board have `cursor-grab` and `active:cursor-grabbing` styles, but there is no visual drag handle or other indicator that the cards are draggable. The cards look identical to clickable cards elsewhere in the application.
- **Impact:** Drag-and-drop is the primary interaction model for the Flow Board, but new users have no visual cue that cards can be dragged. The `cursor-grab` only appears on hover, which is not available on touch devices.
- **Recommendation:** Add a visible drag handle (grip dots icon) to the left side of each card. Add a subtle hover state that lifts the card (increased shadow, slight scale) to suggest interactivity.

#### M4: Empty states lack visual design
- **Location:** Multiple pages (ProductListPage, SpecListPage, PhaseColumn)
- **Description:** Empty states use minimal text styling. The Flow Board's empty columns show "No specs in this phase" in tiny gray text. The product list empty state has a card with centered text and an outline button.
- **Impact:** Empty states are the first thing new users see. The current implementation provides no guidance, illustration, or visual warmth. The Flow Board's empty columns feel broken rather than intentionally empty.
- **Recommendation:** Add illustrative empty states with icons and action-oriented messaging. For the Flow Board, empty columns could show a dashed-border drop zone with "Drag specs here" text.

#### M5: No visible focus indicators on interactive elements
- **Location:** Application-wide
- **Description:** While shadcn/ui buttons have `focus-visible:ring-2` styles, the spec cards, navigation links, and collapsible triggers lack visible keyboard focus indicators. The product cards in the list page are wrapped in `<Link>` elements but the focus ring may be suppressed by the card styling.
- **Impact:** Keyboard-only and screen reader users cannot easily track their position when tabbing through the interface. This is an accessibility concern that also affects power users who prefer keyboard navigation.
- **Recommendation:** Ensure all interactive elements have visible focus rings. Add `focus-visible:ring-2 focus-visible:ring-ring` to card links, collapsible triggers, and spec cards.

### Low-Severity Issues

#### L1: Inconsistent card padding and spacing
- **Location:** Various pages
- **Description:** Card components use default shadcn padding, but custom content within cards has varying internal spacing. The checklist sidebar items are at `space-y-2` while the main content cards use `space-y-6` between them. The spec form's collapsible sections have different spacing (`px-1 pt-3 pb-1`) than the card sections they sit alongside.
- **Recommendation:** Standardize internal card padding and section spacing using a consistent scale (e.g., 16px internal padding, 24px between sections).

#### L2: Date formatting is inconsistent
- **Location:** Product list vs. detail pages
- **Description:** Product list cards show `Created 3/20/2026` while detail pages show `Created: 3/20/2026, 1:51:40 PM`. Different `toLocaleString()` / `toLocaleDateString()` calls produce different formats.
- **Recommendation:** Create a shared date formatting utility that produces consistent output across the application. Use relative dates for recent items ("2 hours ago") and absolute dates for older items.

#### L3: Breadcrumbs not present on all pages
- **Location:** SpecListPage has breadcrumbs; ProductDetailPage and SpecDetailPage do not
- **Description:** The `Breadcrumbs` component is used on some pages (SpecListPage, IntentionListPage) but not on detail pages (ProductDetailPage, SpecDetailPage) or the FlowBoardPage. Navigation context is inconsistent across the hierarchy.
- **Recommendation:** Add breadcrumbs consistently to all pages that are deeper than the root level. The SpecDetailPage especially needs breadcrumbs since it is deeply nested (Product > Specs > Spec Detail).

#### L4: Typography lacks variety and character
- **Location:** Application-wide
- **Description:** The application uses the system font stack exclusively with only two weights visible (normal and bold). Font sizes follow a limited scale (text-xs, text-sm, text-base, text-lg, text-2xl). There is no display font, monospace treatment for technical values, or typographic personality.
- **Recommendation:** Consider using Inter or another geometric sans-serif for headings to add character while keeping the system font for body text. Use a monospace font for spec IDs, code-related context values, and technical identifiers.

#### L5: The "Peer Reviewed" checkbox in the spec form uses native HTML styling
- **Location:** `SpecForm.tsx` line 313
- **Description:** The peer review checkbox uses a native `<input type="checkbox">` with minimal Tailwind classes (`h-4 w-4 rounded border-input`) rather than a shadcn/ui Checkbox component. This creates a visual inconsistency with the rest of the form.
- **Recommendation:** Replace with the shadcn/ui Checkbox component for visual consistency.

## Mockups Created

| Mockup | Demonstrates | File |
|--------|-------------|------|
| Branded Header & Navigation | Brand mark, accent bar, nav active states, breadcrumb integration | `.ux-review/mockups/01-branded-header-navigation.html` |
| Semantic Phase Badge System | Distinct colors per phase, colored card borders, complexity badge differentiation | `.ux-review/mockups/02-semantic-phase-badges.html` |
| Product Detail Page Redesign | Hero section, action bar, content grid, visual WIP indicators | `.ux-review/mockups/03-product-detail-page-redesign.html` |

## Design System Recommendations

### 1. Establish a Semantic Color System
The most impactful change would be defining semantic colors for workflow phases. Add CSS custom properties:
```css
--phase-draft: 210 15% 60%;
--phase-ready: 217 91% 60%;
--phase-in-progress: 38 92% 50%;
--phase-review: 258 90% 66%;
--phase-validating: 25 95% 53%;
--phase-done: 142 71% 45%;
```
Extend the badge component with phase-specific variants rather than reusing the limited default/secondary/outline/destructive set.

### 2. Define a Button Hierarchy
Create clear button tiers: Primary (one per page section, the most important action), Secondary (outline, for alternatives), Tertiary (ghost, for low-priority actions), and Destructive. Currently, most pages show 4-6 buttons all at the same visual level.

### 3. Create a Consistent Page Layout Template
Define standard page layout patterns: (1) List Page (heading + action bar + grid of cards), (2) Detail Page (hero section + action bar + content sections + sidebar), (3) Form Page (heading + form + optional sidebar). Currently each page re-implements layout from scratch.

### 4. Add Loading and Empty State Patterns
Create reusable skeleton loader and empty state components. The skeleton should match the card and list layouts. Empty states should include an icon, descriptive text, and a primary CTA.

### 5. Introduce Visual Affordances for Drag-and-Drop
The Flow Board is a core feature but drag interactions have no visual language. Define: (1) drag handle icon on draggable items, (2) hover lift effect (shadow + slight scale), (3) drop zone highlight (dashed border + color), (4) dragging state (reduced opacity + rotation hint).

### 6. Standardize Spacing Scale
While Tailwind provides a spacing scale, the application does not use it consistently. Document and enforce: 4px for tight spacing, 8px for related elements, 16px for section padding, 24px between sections, 32px between page regions.
