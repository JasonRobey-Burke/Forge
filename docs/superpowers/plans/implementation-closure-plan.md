# Forge Implementation Closure Plan

Last updated: 2026-04-14
Owner: Jason Robey

## Goal

Close the highest-impact UX and workflow gaps identified in the implementation review, move `SPEC-003` from `Review` to completion confidence, and make the current product experience polished and accessible.

## Scope

This plan covers:

1. Remaining P0/P1 partial implementations.
2. Accessibility and responsive behavior gaps.
3. Onboarding/help improvements for IDD clarity.
4. Plan/docs alignment so the `/plans` area has meaningful content.

This plan does not cover:

- Dashboard/metrics (UXRV-019)
- Assignment and "My Work" (UXRV-020)
- Slide-out board preview (UXRV-021)

## Success Criteria

- Board is keyboard-usable with an explicit non-DnD move fallback.
- Flow/list filtering exists where needed and persists during navigation.
- Product/spec detail interactions feel intentional (primary actions are clear).
- Accessibility semantics are improved for dynamic updates and progress.
- Flow Board behaves well on tablet/mobile widths.
- `SPEC-003` metadata is updated to reflect validated implementation state.

## Work Plan

## Phase 1 - Close Critical Partials (1 sprint)

### 1) UXRV-001: Explicit card-level move fallback

Deliverables:

- Add a `Move to...` dropdown/action menu on each spec card.
- Ensure keyboard users can trigger move actions without drag.
- Reuse existing transition mutation path so gates/WIP behavior stays consistent.

Acceptance checks:

- From card actions, user can move a spec to any valid phase.
- Action works with keyboard-only navigation.
- Existing toasts/errors/gate dialogs continue to work.

### 2) UXRV-004: Flow Board filtering + session persistence

Deliverables:

- Add search input to Flow Board page.
- Optional phase and complexity filters for board cards.
- Persist list/board filters for session scope (`sessionStorage` or URL query params).

Acceptance checks:

- Board filter state survives route changes and back navigation in the same session.
- Product/spec list filters also persist (same persistence pattern).
- Empty filter result state is clear and actionable.

### 3) UXRV-018: deterministic cancel navigation

Deliverables:

- Replace `navigate(-1)` in `SpecForm` cancel with deterministic target route.
- Keep behavior consistent for create/edit contexts.

Acceptance checks:

- Cancel always lands on predictable parent screen.
- No regressions in existing form submission flow.

## Phase 2 - Polish Detail Experience (1 sprint)

### 4) UXRV-010: product detail collapsible sections

Deliverables:

- Make Context and WIP sections collapsible on product detail.
- Preserve open/closed state during session.

Acceptance checks:

- Sections can be toggled with mouse and keyboard.
- State persistence works while navigating within product pages.

### 5) UXRV-011: make Edit action primary on spec detail

Deliverables:

- Update action hierarchy so Edit is visually primary.
- Keep Export grouped and transitions prominent.

Acceptance checks:

- Primary action stands out and aligns with expected author workflow.
- No CTA conflicts between edit/transition/export actions.

## Phase 3 - Accessibility + Responsive Hardening (1 sprint)

### 6) UXRV-014: responsive Flow Board behavior

Deliverables:

- Add horizontal scroll strategy for medium widths.
- Add stacked/list presentation for small widths.
- Preserve column context and usability while scrolling.

Acceptance checks:

- Usable at <1200px and <768px.
- No clipped or inaccessible drag handles/actions.

### 7) UXRV-015: dynamic A11y semantics

Deliverables:

- Add `aria-live` region(s) for transition/checklist feedback.
- Add progress semantics to checklist completion bar.
- Ensure status updates are screen-reader discoverable.

Acceptance checks:

- Transition success/failure is announced.
- Checklist completion has semantic progress metadata.

## Phase 4 - Onboarding + Plan Hygiene (parallel/short)

### 8) UXRV-013: IDD onboarding/help

Deliverables:

- Add lightweight inline help for key IDD terms.
- Add targeted helper copy for Boundaries/Deliverables/Validation.
- Add first-run or discoverable "Getting Started" guidance.

Acceptance checks:

- New users can understand hierarchy and key terms without external docs.
- Help is contextual and non-intrusive.

### 9) Plan/docs alignment

Deliverables:

- Keep this plan and `docs/implementation-status.md` in sync after each phase.
- After implementation validation, update `docs/specs/SPEC-003.yaml` phase/review metadata.

Acceptance checks:

- `/plans` shows this plan in app.
- Status doc reflects current completed/in-progress/remaining state.

## Suggested Ticket Order

1. Card-level move fallback (UXRV-001)
2. Board filters + persistence (UXRV-004)
3. Deterministic cancel (UXRV-018)
4. Product section collapsibles (UXRV-010)
5. Spec detail CTA hierarchy (UXRV-011)
6. Responsive board (UXRV-014)
7. ARIA live/progress semantics (UXRV-015)
8. IDD onboarding/help (UXRV-013)
9. SPEC-003 metadata/status update and final docs sync

## Validation Checklist (release gate)

- `npm run typecheck`
- `npm test`
- `npm run build`
- Manual keyboard-only board transition walkthrough
- Manual responsive check at desktop/tablet/mobile widths
- Verify `/plans` lists and opens this plan
