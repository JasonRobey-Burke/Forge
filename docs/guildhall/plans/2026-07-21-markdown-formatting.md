---
quest: Render Forge artifact content as formatted markdown instead of raw text
mode: feature
started: 2026-07-21
spec: docs/superpowers/specs/2026-07-21-markdown-formatting-design.md
slug: markdown-formatting
status: completed
model_check: "haiku (param honored)"
parent_model: claude-opus-4-8
---

# Plan

## Context

### Spec Goal (verbatim)
> All artifact prose renders as formatted markdown, consistently, while preserving
> the current card-based layout. Short fields gain inline formatting without
> disrupting their size/spacing; long-form documents get full document typography.

### Root causes (both must be fixed)
1. `@tailwindcss/typography` not installed; `tailwind.config.ts` has `plugins: []`, so the
   `prose` classes in `MarkdownRenderer` are no-ops.
2. Prose fields render as plain `<p>{value}</p>` / `<li>{item}</li>`, bypassing the renderer.

### Cited patterns from the codebase
- `src/client/components/MarkdownRenderer.tsx` — existing renderer, `react-markdown` + `remark-gfm`,
  wrapped in `prose prose-sm dark:prose-invert`. Already consumed by `ReviewDetailPage`,
  `SpecDetailPage` (review section), `PlanDetailPage` in **block** form.
- Plain-text render sites to convert (inline variant):
  - `SpecDetailPage.tsx`: `:296` description; `:337` context.auth; `:348` boundaries `<li>`;
    `:359` deliverables `<li>`; `:373`/`:381` validation `<li>`; `:309`/`:319`/`:329` context
    stack/patterns/conventions Badge content.
  - `ProductDetailPage.tsx`: `:227` problem_statement (view mode); `:297` vision (view mode).
  - `IntentionDetailPage.tsx`: `:242` description (view mode).
  - `ExpectationDetailPage.tsx`: `:232` description (view mode).
  - `AdditionalFields.tsx`: `:55` `<p className="text-sm whitespace-pre-wrap">{value}</p>`.
- Edit-mode (`Textarea`/`InlineField`) render paths are OUT of scope (view-only per non-goals).
- Tests: Vitest client project — jsdom, `@testing-library/react` available, setup
  `src/client/test/setup.ts`, pattern `src/client/**/*.test.tsx`.

### Pre-dispatch decisions
- **No Aldric.** Work matches an existing pattern (`MarkdownRenderer` already exists); a `variant`
  prop + a sweep of call sites is not novel or cross-cutting.
- **Badge tag fields** (stack/patterns/conventions): apply inline markdown for consistency with the
  approved "everything" scope; harmless when the tag has no markdown syntax. Flag for the manual/UI
  pass to confirm badge layout is intact.

## Dispatch sequence

### Sequential build
1. [ ] Seraphine Dawnveil — `test-author` (RED)
   - Input: spec excerpt; jsdom client test setup; `MarkdownRenderer` current source.
   - Expected: `src/client/components/MarkdownRenderer.test.tsx` — failing tests asserting the
     `variant` prop behavior (block emits h1/ul/strong; inline emits strong/code without block
     heading sizing). Must fail RED (variant prop does not exist yet).
2. [ ] Bruga Ironseam — `feature-implementer` (GREEN)
   - Input: failing test path + counts; spec approach; the call-site list above.
   - Expected: install `@tailwindcss/typography`, register in `tailwind.config.ts`; add `variant`
     prop to `MarkdownRenderer`; route all listed call sites through `<MarkdownRenderer variant="inline">`.
     All Seraphine tests green, zero regressions, typecheck passes.
3. [ ] Tink Whiffletree — `refactorer` (CONDITIONAL)
   - Dispatch only if the green diff shows duplicated wrapper markup or unclear naming worth a narrow fix.

### Parallel reviews (after green) — single message, multiple Agent calls
- [ ] Oriana the Watcher — `security-reviewer` — Focus: XSS surface of markdown rendering (raw-HTML
  disabled? link/autolink handling? untrusted YAML content).
- [ ] Cassian Inkwell — `docs-writer` — Focus: document the `MarkdownRenderer` `variant` prop + that
  artifact fields support markdown.
- [ ] Vera Nightwhistle — `ui-test-author` — Focus: Playwright test that a detail page renders
  formatted markdown (e.g., a `**bold**`/heading in a description renders as an element, not literal).
- [ ] Lior Brightpath — `accessibility-reviewer` — Focus: rendered heading hierarchy, link semantics,
  list semantics from markdown output.

### Closer
- [ ] Rook Mossbrook — `pr-author`

## Reviewers selected

Always-on:
- Oriana (`security-reviewer`) — fires — markdown rendering is the classic XSS surface; genuinely relevant.
- Cassian (`docs-writer`) — fires — new `variant` prop + user-facing capability worth documenting.

Gated:
- Vance (`observability-reviewer`) — skipped — pure client presentational rendering; no request/job-time
  code path, no logging/error surface of consequence.
- Thalia (`reliability-reviewer`) — skipped — no network I/O, queues, retries, or concurrency.
- Cassia (`performance-reviewer`) — skipped — no DB/hot path/user-scale data; rendering small strings.
- Garran (`ops-readiness-reviewer`) — skipped — client-bundle change only; no env, migration, flag, or
  rollout risk beyond a normal redeploy.
- Ysolde (`migration-safety-reviewer`) — skipped — no migrations/schema/backfills.
- Lior (`accessibility-reviewer`) — fires — pairs with Vera; markdown output produces headings/lists/links
  with real a11y semantics.
- Vera (`ui-test-author`) — fires — UI work present (detail pages render the formatted output).

## Decisions made by Mordain
- Skipped Aldric — existing pattern, not novel.
- Chose inline vs block variant split per approved brainstorm decision (short fields = inline/compact).
- Fired only reviewers with real surface (Oriana, Cassian, Vera, Lior); the production-readiness
  reviewers' territories (network, DB, migrations, deploy ops, request-path observability) are absent
  from a client-side rendering change — documented above rather than fired ceremonially.

## Lessons for the Guildhall
- **A11y HIGH surfaced late, not in the plan.** Lior found the `inline` variant emitted real `<h1>`–`<h6>`
  elements (heading-outline pollution). The build chain and spec both framed inline purely as *visual*
  reset; the semantic-element consequence wasn't anticipated. Pattern suggestion: when a feature renders
  user-authored markup into an existing document, the plan should call out semantic-element output (not
  just styling) as a first-class review dimension. First occurrence — not yet a Guildhall-level amendment.
- **E2E automated gate is environment-blocked in this sandbox.** Port 4000 (Forge API) rejects HTTP
  payloads at the host level, so `npm run test:e2e` cannot run green here; reproduced independently and
  affects the pre-existing e2e suite too. Behavior was instead verified via unit contract + production
  build + manual browser check. First occurrence.
- **Pre-existing orthogonal defect (not this quest's):** `e2e/helpers.ts` create/delete helpers
  (`createProduct`/`createSpec`/`deleteEntity`, etc.) call POST/DELETE routes that don't exist in the
  current server — broken on `main` too, consistent with the "View + Edit only" pivot. Worth its own ticket.
- No gate breaks in the build chain: RED held twice, GREEN passed first try both times (no Bruga retry used).

## Open items for the user
- **E2E confirmation:** re-run `npx playwright test e2e/markdown-rendering.spec.ts` in a normal
  (non-sandboxed) environment to get the official green — expected to pass based on manual verification.
- **A11y follow-ups (deferred by decision — HIGH already fixed):**
  - MED: markdown block content (headings/nested lists) can still render inside `<Badge>` tag chips
    (stack/patterns/conventions) and inside single `<li>` items (boundaries/deliverables/validation).
    Consider a stricter "compact" preset (bold/italic/code/links only) for those contexts.
  - LOW: markdown images (`![alt](src)`) are now renderable in prose fields with no alt-text guardrail —
    worth a content-authoring note in the IDD plugin guidance.
  - INFO (Lior): verify rendered link/inline-code contrast (`--tw-prose-links`) against `bg-secondary`
    (Badge) and `text-muted-foreground` (`context.auth`) in light and dark themes.
  - INFO (Oriana): add a defense-in-depth test asserting `[x](javascript:alert(1))` yields a stripped
    href (behavior is already safe via react-markdown's default `urlTransform`; no test guards it).
- **Dead e2e helpers ticket** (see Lessons) — independent of this feature.
