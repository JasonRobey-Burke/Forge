# Inline Editing for Detail Pages

**Date:** 2026-03-25
**Status:** Approved

## Problem

Detail pages use a clunky edit mode: clicking Edit replaces the left column with a single form card containing all fields. Hero fields (name, problem statement) and right-column fields (WIP limits) remain static and can only be edited from within the form card, breaking spatial context.

## Solution

Replace the current "swap left column with form card" pattern with true inline editing. When the user clicks Edit, every editable field on the page becomes editable in place. Fields get a subtle blue border and pencil icon as affordances. The page layout remains stable — nothing moves.

## Design

### InlineField Component

A thin visual wrapper that handles edit-mode styling:

- **Props:** `editing: boolean`, `className?: string`, `children: ReactNode`
- **When `editing` is false:** renders children as-is with no visual change
- **When `editing` is true:** wraps children with `border-blue-300 bg-blue-50` border and a pencil icon at top-right
- Contains no form logic — purely visual

### Page-Level Edit Pattern

Each detail page keeps its existing `editing` state toggle and `FormProvider`. Form fields render inline at their natural positions instead of being grouped in a single card.

**ProductDetailPage:**
- Hero: name becomes Input, problem_statement becomes Textarea
- Left column: vision and target_audience become Textareas, context card fields become tag editors
- Right column: WIP limit tiles become number inputs inside the existing tile layout

**IntentionDetailPage:**
- Hero: title becomes Input
- Description card: content becomes Textarea
- Priority already uses inline status select

**ExpectationDetailPage:**
- Hero: title becomes Input
- Description card: content becomes Textarea
- Edge cases: list becomes editable field array

**SpecDetailPage:**
- Excluded from inline editing in this phase. SpecDetailPage has no existing form plumbing (`useForm`, `FormProvider`), and its fields require complex `useFieldArray` management for boundaries, deliverables, and validation lists plus `useWatch` integration with the completeness checklist. Adding inline editing here is a separate, larger effort.
- The Edit button continues to link to `/specs/:id/edit` (SpecEditPage)

**Not changed:** Read-only relationship sections (linked Intentions, Expectations lists, Dependencies), InlineStatusSelect (already inline), phase transition controls, breadcrumbs, PrevNextNav.

### StickyEditBar Component

A fixed-position bar at the bottom of the viewport that appears when the user scrolls past the action bar.

- **Props:** `onSave`, `onCancel`, `isPending: boolean`
- Each detail page attaches a `ref` to its action bar `<div>` and passes it to `StickyEditBar` via an `actionBarRef` prop. `StickyEditBar` observes that ref with `IntersectionObserver`
- Dark background (`bg-zinc-900`) with "Unsaved changes" label + Save + Cancel
- Disappears when `editing` becomes false
- Used by Product, Intention, and Expectation detail pages (Spec detail page is excluded from inline editing)

### Save/Cancel Placement

Save and Cancel buttons appear in two locations:
1. **Action bar** — Edit button transforms into Save + Cancel (existing pattern)
2. **Sticky bar** — appears at viewport bottom when action bar scrolls out of view

### Removed Code

**Pages removed:**
- `ProductEditPage.tsx`
- `ExpectationEditPage.tsx`
- `IntentionEditPage.tsx` (already dead code — route uses `RedirectToDetail`)

**Routes removed:**
- `/products/:id/edit`
- `/expectations/:id/edit`
- `/intentions/:id/edit` (already redirects, remove the redirect entry)

**Form component cleanup:**
- `ProductForm.tsx` — remove default `ProductForm` wrapper, keep `ProductFormFields` export and helpers (`productToFormValues`, `productToApiValues`)
- `IntentionForm.tsx` — remove wrapper, keep `IntentionFormFields`
- `ExpectationForm.tsx` — remove wrapper, keep `ExpectationFormFields`

### Routes Kept

- `/specs/:id/edit` — SpecEditPage has enough complexity (completeness checklist with `useWatch`, context editor with `useFieldArray`) to justify keeping as a power-user fallback

## Scope Boundaries

- No server-side changes
- No new API endpoints
- No changes to Zod schemas or TypeScript types
- No changes to the Flow Board
- No changes to list pages
- SpecDetailPage inline editing is deferred to a follow-up
- Navigation guards (unsaved changes warning on route change) are out of scope — the existing edit pattern had the same gap, and this can be addressed as a separate improvement across all pages
