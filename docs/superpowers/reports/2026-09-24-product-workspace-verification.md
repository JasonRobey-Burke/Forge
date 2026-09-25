# Product workspace verification

Date: 2026-09-25
Status: Implementation verification complete; closing review and PR-draft outcomes are recorded in the quest record.

## Scope and evidence

This report covers the [approved design](../specs/2026-09-24-product-workspace-design.md) and [implementation plan](../plans/2026-09-24-product-workspace.md), implemented through Guildhall cycles A–J and supplemental UI verification. The [quest record](../../guildhall/plans/2026-09-24-product-workspace.md) retains per-cycle RED/GREEN evidence, source/test ownership and the complete baseline-to-current inventory, including untracked files.

Baseline: `fd0a6a7334bbd369b2b5f20adc480f0082dfb01e`, initially clean. The documentation handoff records 162 changed paths, including the coordinator-owned quest plan; see the quest record for the final post-writer hash inventory. The quest plan is excluded from self-hashing. All tracked and untracked changes are quest-owned. Results below are coordinator-observed unless identified as worker evidence. Documentation is based on that evidence and current source, not a committed Git range alone.

The implementation is local and uncommitted. No release, npm publication, push, merge, deployment or external-service change is claimed. Real product, intention, expectation and spec YAML was not used as test fixture data.

## Delivered behavior

| Area | Implemented behavior | Verification basis |
| --- | --- | --- |
| Source persistence | Document-preserving field edits, exact revisions, validated candidates, contained paths, checked rename and index publication after success | Codec/file/store/API tests, including source fidelity, stale/deleted files, phase bypass and filesystem failures |
| State | Shared projection separates coverage, unique spec phases and reported validation; invalid relationships, unknown states and incomplete snapshots remain inspectable | Projection suites and workspace drilldown browser cases |
| Editing | Overview expand → expectation edit → save; shared full-page/settings draft protection, conflict compare/copy/reload and explicit session recovery | Client suites plus editing/safety browser cases |
| Planning | Optional Now/Next/Later/Unscheduled placement, keyboard order controls, target-window labels and validated dependencies | Roadmap unit/browser cases with saved-file assertions |
| Connected views | Expandable/paginated map, outcome-filtered Delivery with existing server gates, exact-ID Evidence sources and missing/unknown results | Map/evidence tests and Delivery/Evidence browser cases |
| Creation | Explicitly reviewed Draft intentions/expectations, confirmed distinct edge cases, canonical fields, exclusive IDs and reciprocal links; same-product reparenting | Creation/schema/transaction suites, collision/recovery tests and creation browser cases |
| Browser regressions | Migrated legacy flows, dirty drafts during external changes/deletion, failed-save retry, recovery, keyboard/focus and responsive layouts | Full default disposable-root Playwright selection |

Review corrections added contained startup/mutation-refresh reads; protected pending form values; a 30-second request deadline; cached-data refresh warnings and Retry; phase-filtered source drilldowns; focus restoration and page identity; and inspectable literal IDs for missing canonical intention children. Cycle J's missing-child correction passed two independently authored browser regressions without changing repository YAML.

There is no overall percent complete. Done remains delivery status, not proof of validation. Report presence does not establish a passing expectation result. Older artifacts require no migration or write-on-read. Roadmap movement changes neither spec phase nor intention status. No hosted collaboration, accounts, AI authoring/execution or additional component library was added.

## Integration results

| Check | Observed result |
| --- | --- |
| `npm test` | 437 passed across 40 suites, 46.07 s, exit 0 |
| `npm run typecheck` | Passed, exit 0 |
| `npm run build` | Passed, exit 0; existing chunk-size and Browserslist warnings retained |
| Default Playwright selection (`npm run test:e2e`) | 90 passed, 0 failed, 0 skipped, 0 flaky, 213.321439 s, exit 0 |
| Supplemental Vera UI selection | Separate coordinator run: 4 passed, 0 failed, 0 skipped, 0 flaky, 7.321095 s, exit 0; worker also passed all 4 |
| Locked tests and scope | 68 test/harness hashes matched after J; Vera's single authorized file adds the 69th lock. J changed only the authorized store source and new regression file; final writer audit belongs to the quest record |

Browser coverage totals 94 unique cases across the full 90-case run and separate four-case supplemental run; no single 94-case full run is claimed. Supplemental cases cover honest validation/direct-spec links, shared-spec filtering with ancestor retention/reload, fulfilled/archived/unsupported roadmap handling with preserved source, and creation edge-case validation/confirmation without writing before explicit Create. Vera mapped the remaining visible requirements to existing browser/component/unit checks and confirmed the missing-child correction live.

Cycle I JSON is `/tmp/forge-cycle-i-root-final-browser.json`; the later Cycle J full-run evidence is recorded in the quest record. Supplemental JSON is `/tmp/forge-vera-root-browser.json`. These are local session evidence, not portable committed artifacts.

An earlier coordinator pre-delivery unit run had 424 passes and one failure: stale-parent intention POST at `artifactCreation.test.ts:64` returned 404 where 409 was expected. The subsequent full run passed 425/425 without source changes. The worker separately observed 14/14 creation tests and 30/30 direct stale-parent POST requests returning the expected 409. The initial failure remains unexplained and unreproduced; these repeats are not a fix claim.

Cycle G consumed and passed its one bounded delivery retry for first-artifact directory preparation. Earlier implementation failures and independently corrected test assumptions remain in the quest record; the final result does not erase them.

## Responsive and large-data observations

The coordinator inspected 1440, 1024 and 390 CSS-pixel states. Cycle H error/saved screenshots are `/tmp/forge-cycle-h-error-{width}.png` and `/tmp/forge-cycle-h-saved-{width}.png` for those widths. Earlier F/G evidence in the quest record covers Map, Evidence, Delivery, creation and reparenting; Delivery wrapping was verified at all three widths. Browser cases check keyboard navigation, focus behavior, reachable editor actions, error associations and successful-save announcements. These checks do not constitute a comprehensive accessibility certification.

Final correction checks include seven targeted accessibility cases and manual Escape focus restoration. Computed sidebar-label contrast was 6.8676:1; the shared dialog and overlay had animation `none`/`0s` under reduced motion. Reduced motion already passed before the reinforcing source change. The coordinator inspected refresh-warning, timeout-source-review and handoff-focus screenshots. Manual evidence in `/tmp/forge-cycle-i-manual-evidence.json` records retained creation text, explicit current-source review and no automatic POST replay.

The exact fixture contained 100 intentions, 1,000 expectations and 1,000 specs. The final Cycle J browser attachment measured first content at 500.491500 ms and expansion at 52.647792 ms, with no per-row artifact GET requests. Branches begin collapsed; filtering and pagination remain reachable. These local observations are not an SLA or a cross-device benchmark, and they do not negate the retained server/allocation performance findings below.

The design's one-minute orientation and two-interaction editing goals remain representative-user usability targets. Automated flows exercise the editing path; no human study validates either target.

## Persistence and recovery limits

All existing-artifact write paths require `If-Match`; missing preconditions return 428 and stale/deleted source returns 409 `REVISION_CONFLICT`. Creation uses the reviewed parent's revision. External updates retain the original draft and revision; conflict actions expose comparison, copying and confirmed reload, without one-click force overwrite. Session recovery is repository/entity/base-revision scoped and never replayed automatically. Storage failure leaves in-memory protection available and displays its limitation.

Pending inputs are protected until completion. The client deadline covers response headers and body reads, but a timeout does not prove the server rejected a write. Timed-out creation retains the draft and requires explicit review of current source/children before another submission. Other transport failures and invalid responses can also leave an uncertain outcome; inspect children and parent links before submitting again. Broader reconciliation is a retained low finding, not a solved idempotency guarantee.

Single-file writes serialize within Forge, preserve file mode and recheck bytes before rename. Ordinary filesystem operations cannot exclude an uncooperative external writer during the final check-to-rename interval. Multi-file creation/reparenting is recoverable persistence, not an atomic filesystem transaction; external readers may observe intermediate state.

Recovery journals under `docs/.forge-transactions/` retain original/proposed bytes and revisions. Rollback and startup recovery compare hashes before restoring or removing files; intervening external edits are preserved. Unresolved affected paths are blocked with `RECOVERY_REQUIRED`. Preserve journals and affected files, inspect the exact reported paths and restart to attempt safe recovery. Do not delete a journal or overwrite source merely to clear the warning; unresolved external changes need deliberate reconciliation. No universal automated recovery or cross-process isolation is promised.

## Disposable E2E setup

Run `npm run build` before `npm run test:e2e`; `npm run test:e2e:workspace` includes a build and selects workspace tests. Both configs use one worker and a dedicated server at `127.0.0.1:4181`, with `reuseExistingServer: false`. The launcher generates a temporary docs root and state marker; normal shutdown removes both. Port 4181 must be available. Fixture helpers create/delete temporary YAML directly and do not imply product/spec creation or deletion APIs. Never substitute a real repository docs root.

## Specialist review record and follow-ups

Selected specialist reviews are complete. All retained findings below are owned by the Forge maintainer; no high findings remain. Counts are per reviewer and can overlap.

| Review | Final outcome and retained findings |
| --- | --- |
| Security — Oriana | 0 high / 0 medium / 0 low / 1 informational. Startup/mutation-refresh containment finding resolved; maintain the pinned YAML parser dependency. Focused J review found no new concern. |
| Reliability — Thalia | 0 high / 0 medium / 2 low / 1 informational. Pending-edit loss and indefinite requests resolved. Retain broader uncertain-creation reconciliation and missed native Markdown-event fallback; the unexplained stale-parent 404 remains informational. |
| Observability — Vance | 0 high / 0 medium / 1 low. Cached-refetch warning/Retry and premature SSE attribution corrected. A failed GET can still display “File changed outside Forge” without revision evidence; drafts remain protected. Focused J review found no new concern. |
| Performance — Cassia | 0 high / 2 medium / 2 low / 1 informational. Medium: mutation refresh reparses/reindexes peers with repeated bookkeeping, and workspace inspection reparses unchanged YAML. Low: collapsed ProductTree eagerly allocates children, and OutcomeList rebuilds product-wide Maps/Sets per intention. Informational: periodic linear byte inventory. Measure save/navigation/idle costs before optimization; no measured regression or SLA is claimed. Focused J review found no new concern. |
| Accessibility — Lior | Final focused review: 0 high / 0 medium / 0 low / 0 informational. Prior dialog/roadmap focus, page identity and filter-action findings resolved; seven targeted browser cases and manual Escape check passed. This remains bounded review, not certification. |
| Operations — Garran | Runbook delivered with upgrade, first-hour checks, rollback, recovery and open operational ownership questions. No hosted operations infrastructure or SLO was introduced. |
| UI — Vera | Live checks complete; four supplemental cases passed independently. Missing canonical child IDs found during review were corrected and regression-tested in J. |

For stale Markdown after missed native events, protect pending drafts before focus/reload. For misleading external-edit copy, compare actual source revisions before assuming a concurrent edit. Performance and dependency follow-ups remain explicit maintenance work.

## Local upgrade and closing record

The [verbatim operations runbook](../../guildhall/plans/2026-09-24-product-workspace.md#garran-final-runbook-verbatim) is for a future authorized local upgrade. Stop Forge and concurrent writers, back up the configured docs root including hidden journals and permissions, then build/start the approved revision. Check `/api/health` diagnostics and exercise creation with disposable data before using real artifacts. The workspace has no feature flag. Rolling back application code does not undo YAML changes; older writers can strip new metadata, and unresolved recovery must be reconciled before downgrade.

This documentation records verified implementation and specialist outcomes. Aldric's closing technical decision and Rook's PR text draft are subsequent orchestration outputs recorded in the [quest record](../../guildhall/plans/2026-09-24-product-workspace.md); this report does not anticipate a PASS or claim an actual PR, commit, push, publication or deployment. Human usability validation, external-writer isolation and retained maintenance findings remain bounded as described above.
