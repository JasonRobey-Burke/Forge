# Forge Implementation Status

Last updated: 2026-09-25

## Current state

The product workspace is implemented and verified in the local worktree through cycles A–J and supplemental UI checks. Selected specialist reviews are complete; closing technical review and PR-draft outcomes are recorded in the [quest record](guildhall/plans/2026-09-24-product-workspace.md). This change has not been committed, published, merged or deployed. The existing package version remains 0.6.0; the published package must not be assumed to contain this workspace.

The three earlier delivery specs were recorded complete in the July status below. Those lifecycle records are distinct from verification of this local change.

## Plan inventory

1. Product-level plan in `docs/products/PROD-001.yaml` (Forge v1.1, Active).
2. Delivery specs:
   - `SPEC-001` Project scaffolding and infrastructure: `Done`
   - `SPEC-002` Product CRUD and navigation shell: `Done`
   - `SPEC-003` Full entity hierarchy and Flow Board: `Done` (closed 2026-07-20; peer review satisfied via merged PR #3)
3. UX backlog in `.ux-review/backlog.md`: all 22 items (P0–P3) complete as of the April execution pass.

## What is built

### Product workspace (local implementation, 2026-09-24)

- Product Overview, Roadmap, expandable Product map, Delivery and source-linked Evidence, with existing deep links and secondary tools retained.
- Separate coverage, delivery and reported-validation counts; incomplete snapshots and missing/unknown evidence remain explicit. Done never implies validation.
- Source-preserving, revision-checked editing with protected drafts, conflict comparison and explicit session recovery; no force overwrite.
- Optional roadmap metadata, keyboard movement/reordering and user-entered target windows independent of lifecycle state; no artifact migration or write-on-read.
- Confirmed user-authored Draft intention/expectation creation and same-product expectation reparenting with reciprocal links and recoverable multi-file persistence.
- Legacy CRUD E2E migrated to disposable filesystem fixtures; full default Playwright selection exercises shipped capabilities without modifying real product YAML.

Review corrections cover contained startup/mutation-refresh reads, protected pending edits, bounded requests, visible refresh failures, phase-filtered drilldowns, focus restoration and literal missing-child diagnostics in the Product map.

See the [verification report](superpowers/reports/2026-09-24-product-workspace-verification.md) for acceptance evidence, filesystem limits and remaining follow-ups.

### Core (SPEC-001 … SPEC-003)

- Full IDD hierarchy wired end-to-end: Products, Intentions, Expectations, Specs.
- YAML-first architecture: in-memory store, write-back to YAML, chokidar file watching, SSE-driven UI refresh.
- Flow Board with drag-and-drop (including keyboard DnD), phase gates, WIP checks/override dialogs, and phase_history audit trails.
- Spec workflow: 11-criteria completeness checklist, context inheritance with diff indicators, YAML/Markdown export, token estimation, review markdown rendering.
- Raw YAML editor for artifact-level direct editing.

### Gap-check awareness (PR #3, merged 2026-07-03)

- YAML parse errors surfaced in a global UI banner; duplicate keys loaded leniently.
- `gap_check` annotations parsed from spec YAML; Ready→InProgress transitions gated on gap-check findings.
- Gap-check badges on cards, gate dialogs explaining blockers, and a pipeline-reports browser.
- Read-only pipeline metrics derived from gap_check annotations and reports.
- Comprehensive edit experience: expectation link management, warning acknowledgment flow, dead-route fix.

### UX execution pass (April 2026)

All UXRV-001 through UXRV-022 backlog items implemented — semantic phase colors, breadcrumbs, skeletons, toasts, responsive board, ARIA live regions, onboarding hints, empty states, flow metrics, owner assignment + My Work view, and slide-out board preview.

## What is left to work on

1. Forge maintainer: measure and address retained performance findings (two medium, two low), broader uncertain-creation reconciliation, missed Markdown refresh events and misleading external-edit copy after a failed GET. See the report for reviewer attribution and dependency maintenance.
2. Validate the one-minute orientation and two-interaction editing usability targets with representative people; browser checks are not a human study.
3. Retain the unexplained one-off stale-parent test failure as a follow-up observation; successful repeats do not establish a fix.
4. Dedicated owner-assignment/My Work test coverage remains a previously identified follow-up outside this workspace verification claim.

## Workspace verification status (2026-09-25)

- `npm test`: 437/437 passing across 40 suites, 46.07 seconds; one earlier pre-delivery run had 424 pass and one stale-parent POST return 404 instead of expected 409, without an identified cause or source fix.
- `npm run typecheck` and `npm run build`: passed; existing chunk-size/Browserslist warnings remain.
- Default Playwright selection: 90 passed, zero failed/skipped/flaky, 213.321439 seconds. A separate coordinator run passed all four supplemental Vera cases in 7.321095 seconds: 94 unique cases across two runs, not one 94-case full run.
- Exact 100-intention/1,000-expectation/1,000-spec fixture: first content 500.491500 ms, expansion 52.647792 ms, zero per-row GETs. These are local measurements, not an SLA.
- Security containment correction and focused reviews completed; supplemental UI checks passed. Closing review and PR-draft outcomes belong to the quest record; no actual PR or release is claimed here.

## Verification status (2026-07-20)

- `npm test`: passing (130/130 across 13 files, Vitest 4)
- `npm run typecheck`: not re-run this pass
- E2E: last verified during the April execution pass (`e2e/plan-execution-smoke.spec.ts` 3/3); legacy CRUD specs known-stale (see above)
