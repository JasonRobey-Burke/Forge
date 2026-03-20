# Persona Walkthrough: Marcus Thompson (Accessibility Advocate)

**Key Traits:** Expert tech comfort, senior developer, keyboard-first navigation, 150% zoom with screen magnification, high-contrast mode, WCAG AA expectations, meticulous and methodical, primary goal is authoring thorough specs and ensuring tool accessibility.

---

## Task: Author a detailed spec, review completeness checklist, move spec through phases -- all via keyboard and at 150% zoom

### Step-by-Step Experience

#### Step 1: Landing on the Products List (/)
- **Action:** Navigated to http://localhost:5173 -- redirected to /products
- **Expected:** Semantic HTML with proper heading hierarchy, visible focus indicators, keyboard-navigable product cards
- **Actual:** Page has a banner landmark with navigation (Forge logo link, Products link), a main landmark, and product cards rendered as links. The heading hierarchy starts with an H1 "Products." Product cards are full `<a>` elements (links) which is good for keyboard access. Each card contains the product name, a phase badge, problem statement, and creation date.
- **Reaction:** "Good start -- the page uses proper landmark regions (banner, main, navigation). The H1 is present. Product cards are links, which means Tab navigation should work to move between them. But I need to check: are there visible focus indicators? The snapshot shows cursor:pointer on links but doesn't tell me about focus ring styling. Also, I notice there's no skip-to-content link, which means keyboard users have to tab through the header navigation on every page load."
- **Friction Level:** 2 -- Minor. Decent semantic structure but missing skip-link and uncertain focus visibility.

#### Step 2: Product Detail Page -- Semantic Structure
- **Action:** Activated the Forge product link
- **Expected:** Proper heading hierarchy, readable content at 150% zoom, labeled sections
- **Actual:** H1 "Forge" with phase badge. Content sections (Problem Statement, Vision, Target Audience, Context, WIP Limits) are rendered as generic divs with text labels -- not as headings or definition lists. The three navigation cards (Intentions, Specs, Flow Board) contain links. Edit and Delete buttons are present.
- **Reaction:** "The H1 is correct, but the section labels (Problem Statement, Vision, etc.) are rendered as generic elements, not as headings (H2/H3) or as `<dt>/<dd>` definition list pairs. A screen reader user would have no heading-based navigation to jump between sections. At 150% zoom, the layout should still work since it appears to be a single-column design, but the WIP Limits section with its small grid of phase/number pairs could get cramped. The navigation cards (Intentions, Specs, Flow Board) are accessible as links, which is correct."
- **Friction Level:** 3 -- Moderate. Missing semantic heading hierarchy below H1 means screen reader users cannot navigate by headings within the page. Section labels should be H2 elements.

#### Step 3: Flow Board -- Keyboard Accessibility (Critical)
- **Action:** Navigated to the Flow Board at /products/.../board
- **Expected:** Keyboard-operable drag-and-drop OR keyboard-accessible alternative for moving specs between phases
- **Actual:** The board uses @dnd-kit with ONLY a PointerSensor configured (confirmed in source code: FlowBoard.tsx line 44-46). There is no KeyboardSensor. Spec cards are rendered as buttons (from dnd-kit's useDraggable attributes), so they are technically focusable. But without a KeyboardSensor, there is NO way to drag a spec from one phase column to another using the keyboard. The column headers show phase names and WIP limit badges. The "Back to Product" link is the only navigation element.
- **Reaction:** "This is a blocking accessibility issue. The Flow Board -- which is the primary workflow view -- is completely mouse-dependent. I cannot move a spec from Draft to Ready, or from In Progress to Review, without a mouse. The @dnd-kit library explicitly supports a KeyboardSensor that enables arrow-key-based dragging, but it has not been configured here. The spec cards have button roles (from dnd-kit), so I can Tab to them, but pressing Enter or Space doesn't trigger a useful action for phase transitions. This means the entire Kanban workflow is inaccessible to keyboard users. I would need to navigate to each spec's detail page individually and use the transition buttons there, which is a completely different (and much slower) workflow from what mouse users get."
- **Friction Level:** 5 -- Blocked. Keyboard users cannot use the board for its primary purpose (moving specs between phases). This is a WCAG 2.1 Level A failure (2.1.1 Keyboard).

#### Step 4: Spec Detail Page -- Transition Buttons as Keyboard Alternative
- **Action:** Navigated to SPEC-002 detail page as the fallback for phase transitions
- **Expected:** Phase transition buttons that work as a keyboard alternative to board drag-and-drop
- **Actual:** Four transition buttons are present: "-> Ready", "-> InProgress", "-> Review", "-> Validating". These are standard `<button>` elements and ARE keyboard accessible (focusable, activatable via Enter/Space). The completeness checklist sidebar shows 11/11 items with checkmark indicators. Export YAML / Export Markdown buttons are also standard buttons.
- **Reaction:** "The transition buttons on the detail page work as a keyboard-accessible alternative to the board's drag-and-drop, which partially mitigates the board issue. But it's a significantly degraded experience: instead of seeing all specs at once on the board and dragging between columns, I have to open each spec individually to transition it. That said, the buttons themselves are properly implemented as real buttons. The completeness checklist uses generic divs with checkmark text -- I'd prefer actual `<input type='checkbox' disabled>` elements or proper ARIA roles (role='status' or role='list' with role='listitem') for the checklist items. The checkmarks are plain text characters, which is fine for screen readers but could be clearer with aria-labels like 'Passed: Context stack is non-empty'."
- **Friction Level:** 2 -- Minor (for the detail page itself). The buttons work with keyboard. The checklist lacks optimal ARIA semantics but is functional.

#### Step 5: Spec Editor -- Form Accessibility
- **Action:** Navigated to SPEC-002 edit page
- **Expected:** Properly labeled form fields, logical tab order, collapsible sections with aria-expanded
- **Actual:** Form fields have visible text labels (Title, Description, Phase, Complexity). The collapsible sections use `<button>` elements with `[expanded]` attributes visible in the accessibility tree (e.g., "button 'Context Modified' [expanded]"), which suggests proper aria-expanded implementation. Each text input has a label. The Stack/Patterns/Conventions lists use individual textbox inputs with "Stack item" / "Patterns item" labels and "Remove" buttons. The comboboxes for Phase and Complexity appear to be shadcn/ui Select components.
- **Reaction:** "The form accessibility is generally decent. Labels are present on inputs, collapsible sections have expanded/collapsed state. But there are issues: (1) The list item labels are generic -- every Stack input is labeled 'Stack item' which makes them indistinguishable for screen reader users navigating by form elements. They should have indexed labels like 'Stack item 1 of 6'. (2) The 'Remove' buttons are all identically labeled -- a screen reader user tabbing through would hear 'Remove, Remove, Remove' with no indication of WHAT is being removed. Each should have an aria-label like 'Remove React 19 from Stack'. (3) The 'Modified' indicators on context fields are visual-only generic elements -- their meaning may not be conveyed to assistive technology. (4) The Phase and Complexity comboboxes appear to have proper ARIA roles."
- **Friction Level:** 3 -- Moderate. Form is keyboard-navigable but has labeling issues that would frustrate screen reader users: generic "Stack item" labels and undifferentiated "Remove" buttons.

#### Step 6: Spec Editor at 150% Zoom (Structural Assessment)
- **Action:** Assessed layout structure for zoom compatibility
- **Expected:** Content reflows gracefully, no horizontal scrolling, badges and small text remain readable
- **Actual:** The editor uses a form + sidebar layout. The form is in a single column with the completeness checklist as a sidebar. The board uses `grid grid-cols-6` for columns. At 150% zoom, the six board columns would likely overflow horizontally since each has a min-width of 200px (6 x 200px = 1200px minimum, which at 150% zoom requires 1800px of viewport width). The badge text uses `text-xs` (Tailwind's 12px / 0.75rem) which at 150% zoom becomes ~18px -- borderline acceptable but small for the WIP limit badges in column headers.
- **Reaction:** "The board's six-column grid with min-w-[200px] columns is going to cause horizontal scrolling at 150% zoom on anything less than an ultrawide monitor. At 1920px viewport, 150% zoom gives an effective width of 1280px -- the six columns at 200px each need 1200px plus 15px gaps, so it barely fits but will be very cramped. On my typical 1440px display at 150%, it will definitely overflow. The badge text at text-xs will be small but readable at 150% zoom. The form editor should be fine since it's single-column. The main concern is the board layout not being responsive."
- **Friction Level:** 3 -- Moderate. Board layout will cause horizontal scrolling at 150% zoom on standard displays. Form editor is fine.

#### Step 7: Navigation and Wayfinding
- **Action:** Assessed overall navigation structure
- **Expected:** Consistent breadcrumbs, skip-link, keyboard shortcuts
- **Actual:** The global navigation has only two elements: "Forge" logo (links to /) and "Products" link. Breadcrumbs appear on the specs list page (Products > Forge > Specs) but NOT on the product detail page, spec detail page, or the board. The board only has "Back to Product" link. There are no keyboard shortcuts and no skip-to-content link.
- **Reaction:** "Navigation is inconsistent. Breadcrumbs show up on the specs list but disappear on the spec detail page and the board. I'd expect consistent breadcrumbs everywhere so I always know where I am in the hierarchy. The lack of a skip-to-content link means I have to tab through 'Forge' and 'Products' on every page load. There are no keyboard shortcuts for common actions (e.g., 'n' for new spec, 'b' for board). For a tool I use daily, keyboard shortcuts would significantly improve efficiency."
- **Friction Level:** 3 -- Moderate. Inconsistent breadcrumbs and no skip-link are accessibility issues that compound with daily use.

---

## Summary

### Delight Moments
- Proper landmark regions (banner, main, navigation) on all pages
- H1 heading present on every page
- Collapsible sections in the editor have proper aria-expanded state
- Form fields have visible labels
- Phase transition buttons on spec detail are genuine `<button>` elements (keyboard accessible)
- Product cards are implemented as links (keyboard-navigable list)
- Completeness checklist provides clear pass/fail status for each criterion

### Friction Points (ranked by severity)
1. **Flow Board has NO keyboard drag-and-drop** (Critical/Blocked) -- Only PointerSensor configured; KeyboardSensor from @dnd-kit is not added. Keyboard users cannot move specs between phases on the board. WCAG 2.1.1 (Keyboard) failure.
2. **Board layout overflows at 150% zoom** (Major) -- Six fixed-width columns (min-w-[200px]) cause horizontal scrolling on standard displays at 150% zoom. Needs responsive/scrollable column layout.
3. **Generic "Remove" button labels** (Major) -- All Remove buttons in list editors are identically labeled. Screen reader users cannot distinguish which item each Remove button targets. Needs aria-label with item content.
4. **Generic "Stack item" / "Patterns item" field labels** (Major) -- All fields in a list section share the same label. Screen reader users cannot differentiate items. Needs indexed or content-based labels.
5. **Missing skip-to-content link** (Moderate) -- No skip link on any page, forcing keyboard users through header nav on every page.
6. **Inconsistent breadcrumb navigation** (Moderate) -- Breadcrumbs present on specs list but missing on spec detail, product detail, and board pages.
7. **Section labels are not semantic headings** (Moderate) -- Product detail sections (Problem Statement, Vision, etc.) use generic elements instead of H2/H3, preventing heading-based navigation.
8. **Completeness checklist lacks ARIA semantics** (Minor) -- Checklist items use generic divs with text checkmarks instead of proper list/status roles.
9. **No keyboard shortcuts** (Minor) -- No hotkeys for common actions (new spec, navigate to board, etc.).

### Overall Verdict
Marcus would NOT adopt this tool in its current state. The Flow Board -- the primary workflow visualization -- is completely inaccessible to keyboard users, which is a WCAG Level A failure. He would be forced to use the spec detail page transition buttons as a workaround, which provides a significantly degraded experience compared to what mouse users get. The form editor is usable but has labeling issues that would frustrate screen reader users. With the addition of KeyboardSensor to the board, proper button/field labeling, and a skip-link, this tool would become usable. It has good foundational semantics (landmarks, labels, real buttons) that suggest accessibility was considered but not fully implemented.

### Recommendations (from Marcus's perspective)
- **Immediately add KeyboardSensor to FlowBoard's DndContext** -- @dnd-kit supports this out of the box; it enables arrow-key-based dragging
- Add a skip-to-content link on every page
- Give each "Remove" button a unique aria-label including the item being removed (e.g., "Remove React 19 from Stack")
- Index or differentiate list field labels (e.g., "Stack item 1", "Stack item 2")
- Make the board responsive at 150%+ zoom -- consider horizontal scrolling container or collapsible columns
- Add consistent breadcrumbs to all pages (product detail, spec detail, board)
- Use H2/H3 elements for section labels on the product and spec detail pages
- Add role="list" and role="listitem" to the completeness checklist
- Consider keyboard shortcuts for power users (navigate, create, transition)
