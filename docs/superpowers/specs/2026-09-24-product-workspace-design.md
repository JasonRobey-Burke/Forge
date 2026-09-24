# Forge product-owner workspace

Date: 2026-09-24
Status: Written design for review; product implementation has not started.
Scope approval: originating task 01a0d3b6-1851-7ea3-8781-1a8155141dd9 approved the product workspace proposal and its five-stage delivery sequence.

## Purpose and success

A product owner should understand where the product stands, where it is going, and what requires a decision, then edit the underlying intent without losing context. Forge remains a repo-local interface to IDD YAML. No hosted collaboration, accounts, AI authoring or execution is added.

Success means a user can identify priorities and blockers within a minute, open an outcome and edit one of its expectations in two interactions, and inspect the source of every progress claim. These are usability targets to validate with representative tasks, not measured results.

The approved workspace approach is retained. This document resolves its UI, data, write-safety and validation details. The accompanying [interactive mockup](../mockups/product-workspace.html) uses Forge's intention names with explicitly illustrative planning and evidence states. It never changes repository artifacts.

## Current-code findings

- `src/client/App.tsx`, `Layout.tsx` and `ProductNav.tsx` separate products, intentions, specs, board and metrics. Existing deep links must remain valid.
- `src/shared/types/intention.ts` lacks roadmap and rationale fields, while the store separately indexes intention dependencies. The parser falls back from description to rationale; writing must not collapse these distinct fields.
- `src/server/lib/yamlStore.ts` retains a parsed raw document but reconstructs documents in typed writers. Product audience has nested fields; expectation edge cases and spec validation may have structured forms. Unrelated edits must not flatten or remove them.
- Raw YAML currently writes before parsing. Typed writers mutate indexed objects before persistence succeeds. Both behaviors are incompatible with reliable draft editing.
- `src/client/hooks/useReviews.ts` associates review documents by filename. File presence does not demonstrate a passing expectation-level validation result.
- `src/server/services/phaseTransition.ts` owns WIP, completeness, gap-check and peer-review gates. Ordinary spec updates also accept phase, creating a bypass that must be closed when consolidating writes.
- `CLAUDE.md` says view/edit only. The approved creation direction changes this policy for intentions and expectations only; update repository guidance when that stage ships.

## Workspace and navigation

The product identity remains visible across Overview, Roadmap, Product map, Delivery and Evidence. Product settings holds technical context and WIP configuration. Existing artifact pages remain available for long documents and direct links. Global My Work, Plans and Reviews remain accessible as secondary tools.

Use restrained neutral surfaces, strong headings, compact aligned rows, a single primary action per region, and state labels with color as reinforcement. Reuse existing shadcn primitives, MarkdownRenderer, phase colors and keyboard-capable board controls. No additional component library.

### Overview

Header: product name, purpose, owner and status, with edit action. A compact state strip shows distinct counts for coverage, spec delivery and recorded expectation validation. Every count opens its filtered supporting records. There is no overall percent complete.

Main column: active outcomes (intentions) ordered by roadmap placement and manual order, then priority and ID when no order exists. Each shows priority, placement, expectation coverage, spec phase counts and validation labels. Expand reveals expectations, their linked specs and an Edit action; opening an outcome and selecting Edit are the two interactions before editing.

Secondary column: attention with specific causes and links: invalid relationships, uncovered expectations, blocked next transitions, review queues and missing evidence. Missing evidence is a concern, not a failing validation. Empty products explain the next useful action; unknown/loading counts are not rendered as zero. Invalid file warnings remain visible and mark summary completeness as uncertain.

### Roadmap

Now, Next, Later and Unscheduled group intentions independently of delivery phase. Existing artifacts without metadata are Unscheduled, including fulfilled intentions. Show completed/archived items through explicit filters; never silently move their planning placement.

Cards expose priority, rationale, owner, dependencies and optional user-entered target windows. Move via a menu and keyboard-accessible controls, with drag-and-drop only as an enhancement. Reordering affects one intention's rank; deterministic ID breaks ties. Changing a column does not change spec phase or intention status. Dependency warnings show the linked outcome and its reported status; they are not a new delivery gate. Reject new self, duplicate, cross-product or cyclic links. Existing invalid links remain inspectable warnings.

### Product map

An accessible expandable tree connects intention → expectations → linked specs. Connectors and indentation provide the distinctive visual treatment without requiring a canvas. A spec linked to several expectations appears under each, but counts only once at product/outcome level. Direct intention-to-spec links are labeled separately and do not imply expectation coverage. Missing links show “No linked spec”; broken IDs show their literal IDs. Filtering retains ancestors. Large datasets use collapsed branches and paginated child lists; all content remains keyboard reachable.

### Delivery and Evidence

Delivery preserves the existing board and phase labels, adds outcome filtering/grouping, and exposes the server gate reason when a transition cannot proceed. Shared specs link back to all relevant outcomes. Overrides continue to require recorded reasons.

Evidence lists associated review, execution, gap-check and pipeline report files with source, artifact association and recorded date when available. Never invent dates from filenames that do not encode them or treat file existence as success. Unsupported report formats remain source documents with unknown result. Missing referenced files are visibly missing. Product scope comes from exact artifact IDs and known relationships, not fuzzy text matching. Global/unassociated reports remain separately discoverable.

## Honest state contract

A pure shared workspace projection receives products, intentions, expectations, specs, relationship IDs and known report references from one store snapshot. The UI does not issue one query per expectation.

| Measure | Definition | Source drilldown |
| --- | --- | --- |
| Expectation coverage | Unique active expectations with at least one existing, same-product spec / all active expectations in scope | Expectations with exact spec IDs, uncovered and invalid links |
| Spec delivery | Unique in-scope specs by recorded phase, including Done | Phase-filtered spec list; unknown phases retained as Unknown |
| Recorded expectation validation | Count whose explicit recorded status is Validated, labeled “reported validated” | Expectation source/status and independently listed supporting evidence |
| Validation evidence | Explicit outcome-level result only when a supported source identifies the expectation and result; otherwise Unknown | Source document; stale/unsupported/missing annotation |
| Attention | Deduplicated concerns keyed by entity and cause | Affected artifact and explanation |

Done is delivery status, not proof of validation. Fulfilled and Done expectation statuses do not automatically count as Validated. A manually reported Validated status without evidence is labeled “Reported validated · evidence unknown.” Existing files do not offer a uniform machine-readable validation result, so the first slice promises status reporting and document access, not verified-pass totals. A later supported parser requires fixture-backed schema mapping; do not introduce a new validation ledger in this redesign.

Exclude archived records from active totals; retain references to them as warnings/inspectable records. An expectation is scoped through its parent intention. A contradictory product annotation is a concern. A cross-product linked spec does not contribute coverage. Deduplicate IDs and never divide by zero. For no expectations, show “No expectations,” not 100%. A snapshot affected by parse errors is explicitly incomplete.

## Data and API design

Add an optional `forge.roadmap` mapping to intention YAML, preserving other `forge` keys:

```yaml
forge:
  roadmap:
    bucket: now # now | next | later; absence means unscheduled
    rank: 1024 # finite numeric sort key within bucket
    target_window: Q4 discovery # optional literal user-entered label; no inferred date
```

Ranks are fractional positions between adjacent items; equal ranks use ID order. Exhausted floating-point precision returns an actionable reorder failure rather than silently changing multiple files. Unscheduled clears bucket/rank only. Priority, rationale, dependencies and owner remain canonical intention fields; do not duplicate them in the extension. Older artifacts need no migration and are not written on read. Unknown extension values are preserved, displayed as unsupported and only replaced by an explicit edit.

Add `GET /api/products/:id/workspace` returning the shared projection plus source revision tokens; maintain `{ data, error, meta }`. Return diagnostics and relationships rather than discarding invalid records. Use one React Query workspace key per product. Mutations invalidate affected workspace/detail/list keys. SSE triggers refetch while the editor retains its draft and original revision.

Entity GET and raw GET responses expose opaque revisions derived from exact file bytes. Every write path used by Forge sends a required expected revision (`If-Match`); missing preconditions return 428 and stale revisions return 409 with a stable conflict code. Update all internal callers together, including dependency/link updates, transition and raw editing. Preserve existing successful response envelopes. Missing/deleted files return a recoverable conflict rather than recreating them.

## Safe persistence and editing

1. Read and hash current disk bytes at save time. Check expected revision, entity identity and file location; do not trust only watcher/index timestamps.
2. Parse a candidate document, applying only user-edited field paths to the original shape. Preserve wrappers versus flat documents, nested unknown fields, aliases used for canonical fields, lifecycle metadata and unrelated extension data. A title change must not rewrite structured edge cases. Unsupported structured fields stay read-only in the ordinary form, with an explanation and advanced source access.
3. Use a YAML document-preserving parser for the write path so unrelated comments and layout survive; add a dependency only after a fixture-backed compatibility probe. Keep normalized read models separate from editable source structures. Do not blindly convert object edge cases to strings on save.
4. Validate the complete candidate before touching disk, including raw YAML identity/type preservation and requested relationship changes. Phase changes go through the transition service; an ordinary update rejects differing phase. Validate known lifecycle enums for edits without destroying legacy unknown values on unrelated saves.
5. Serialize writes per file, prepare a sibling temporary file, preserve mode, recheck current disk revision immediately before atomic rename, then update the index and emit change only on success. On validation or filesystem error, retain original file and indexed state, clean temporary files, return an actionable error. Paths must resolve inside the configured docs root; symlinks outside it are rejected.
6. Ordinary filesystem access cannot guarantee compare-and-swap against an uncooperative external process in the tiny check-to-rename interval. State this limit accurately; a concurrent-edit test must prove stale drafts are rejected, not claim absolute cross-process transaction isolation.

The shared side editor uses React Hook Form and shared Zod schemas, with description Markdown preview, owner, type-appropriate priority/status, edge cases and relationships. Status labels explain that editing status does not add validation evidence. Selecting another artifact, closing, navigating or reloading protects unsaved drafts. Keep an in-memory draft while the panel is open plus session-scoped recovery keyed by repository identity, entity and base revision. Clear recovery on save/discard; never replay a recovered draft automatically. If session storage is unavailable, keep in-memory protection and visibly explain recovery is unavailable.

Save and Cancel are always visible; double submits are prevented. A failed save leaves text intact. External updates never reset form values: show “File changed outside Forge” with compare/reload actions. Reload asks before discarding. On conflict, allow copying the draft and reviewing current source; there is no one-click force overwrite. Full-page editing shares the same draft controller. Product settings/context editing uses the same preconditions.

## Guided creation: consequential scope decision

Recommended interpretation of the approved direction: Forge may create user-authored **Draft intentions and Draft expectations**, after explicit review of their content. It does not generate content, publish lifecycle decisions, create products/specs, delete artifacts or invoke IDD tools.

Intention steps: choose product, enter purpose/title, description and rationale, choose priority/owner, review exact draft content, create. Expectation steps: choose intention, describe a measurable outcome and acceptance criteria, enter at least two distinct nonempty edge cases, explicitly confirm those cases, review, create. Persist criteria only in a field verified against the installed IDD canonical schema; if that schema has no separate field, retain criteria in the confirmed description rather than inventing a parallel schema.

Canonical creation shapes and status casing must be verified against the installed IDD framework before implementing this stage. IDs are allocated from a fresh directory scan and files created exclusively (`wx`); collisions retry with the next ID and never replace existing files. Parent existence and product scope are checked again at commit. Return the newly parsed entity/revision. Partial/failed creation never navigates away from the draft.

**Review decision:** confirm this narrow Draft-only creation policy, replacing the current view/edit-only policy for these two artifact types. If the user wants IDD-owned creation retained, ship a guided handoff instead. This decision does not block the safe editing/Overview slice.

## Delivery boundaries

1. Written design and interactive Overview/Roadmap/editor mockup (this change).
2. Shared projection, diagnostics, optional metadata and reliable persistence; test source fidelity and failure behavior before expanding editor exposure.
3. Complete Overview → expand intention → edit expectation → save → updated projection with context retained. This is the first product-code release slice.
4. Roadmap order/dependencies, connected map/Delivery/Evidence navigation and guided creation once its narrow policy is confirmed.
5. Responsive/accessibility/larger-data validation and full workflow regressions. Update stale CRUD E2E tests to the explicitly shipped capabilities, not assumptions from old fixtures.

Do not widen scope to orchestration, server deployment, external service changes, publishing or merging. Implementation details and file ownership will be captured in the implementation plan after this written design is reviewed.

## Verification and acceptance matrix

- Projection unit cases: empty product; shared specs; absent/dangling/cross-product links; archived entities; unknown statuses; incomplete snapshot; reported Validated without evidence; Done without validation.
- Persistence/API cases: nested audience/edge cases/validation and unknown extensions/comments survive unrelated edits; flat/wrapped fixtures; stale revision; deleted file; invalid YAML; changed identity; external edit before save; permission/rename failure; index unchanged on failure; symlink escape; phase bypass rejected; existing gates/history preserved.
- Client tests: dirty form survives SSE; saved response updates workspace; error keeps draft; conflict compare/reload; recovered draft review; Cancel protection; source count drilldown; panel focus restored.
- E2E with disposable docs root: expand/edit/save/reload; external filesystem modification while editing; failed save/retry; keyboard navigation and focus trap; roadmap move and reprioritize persistence; duplicate creation ID; invalid dependency; deep links and board transitions.
- Responsive checks at 1440, 1024 and 390 CSS pixels. Narrow screens use a full-width editor with reachable Save/Cancel; roadmap is stacked; no essential horizontal scrolling.
- Large fixture: 100 intentions, 1,000 expectations and 1,000 specs, no per-row network requests, collapsed rendering by default. Measure interaction behavior rather than claiming unmeasured performance.
- Run typecheck, unit suites, production build and affected Playwright flows against the implementation. Mockup review is not runtime verification.

## Design self-review

The design preserves all five approved delivery stages. No aggregate percentage, automatic validation, inferred planning dates or destructive migration is introduced. Creation policy is the sole product-semantics decision called out for confirmation; source-preserving write behavior and implementation checks are concrete requirements. The mockup is intentionally illustrative and must not be mistaken for the current repository's delivery state.
