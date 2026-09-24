# Product Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the approved product-owner workspace with trustworthy progress, safe contextual editing, roadmap planning, connected delivery/evidence and user-confirmed Draft creation.

**Architecture:** Keep YAML as the source of truth and the existing normalized in-memory index. Introduce a source-document codec and revision-checked persistence boundary, a shared product projection, and one reusable draft editor. All workspace views consume that projection; existing deep links and the Flow Board continue to work.

**Tech Stack:** React 19, TypeScript, Vite 8, Tailwind CSS 3, existing shadcn/Radix primitives, React Hook Form, Zod, TanStack Query, Express 5, chokidar, Vitest and Playwright. Add `yaml@2.8.3` for document-preserving writes after the compatibility fixtures below; retain js-yaml's existing legacy read compatibility.

**Spec:** `docs/superpowers/specs/2026-09-24-product-workspace-design.md` (approved 2026-09-24, including user-confirmed Draft-only intention/expectation creation). Mockup: `docs/superpowers/mockups/product-workspace.html`.

## Global Constraints

- “Forge remains a repo-local interface to IDD YAML.”
- “No hosted collaboration, accounts, AI authoring or execution is added.”
- “No additional component library.”
- “There is no overall percent complete.”
- “Changing a column does not change spec phase or intention status.”
- “Done is delivery status, not proof of validation.”
- “Older artifacts need no migration and are not written on read.”
- “Missing preconditions return 428 and stale revisions return 409 with a stable conflict code.”
- “External updates never reset form values.”
- “There is no one-click force overwrite.”
- “Responsive checks at 1440, 1024 and 390 CSS pixels.”
- “Large fixture: 100 intentions, 1,000 expectations and 1,000 specs, no per-row network requests, collapsed rendering by default.”
- “Do not widen scope to orchestration, server deployment, external service changes, publishing or merging.”
- Keep Node >=20 compatibility from package.json. This worktree is already isolated; continue here, do not create a second task or checkout. Do not alter real `docs/products`, `docs/intentions`, `docs/expectations` or `docs/specs` as test fixtures.

## Review Focus

1. A legacy file contains duplicate mapping keys or conflicting aliases: keep it readable with diagnostics, prohibit ambiguous form writes, and allow an explicit valid raw repair (Tasks 1–4).
2. Watcher refresh races a user draft or a second transition consumes the last WIP slot: preserve the original draft revision and serialize server-owned product mutations (Tasks 2–4, 6).
3. Two repositories use the same artifact IDs, or browser storage fails: drafts never cross repositories and storage failure never prevents an in-memory save (Task 6).
4. Canonical creation requires a reciprocal parent child-list update: a failed second file write must not silently leave an apparently successful half-created artifact (Task 12).
5. A referenced report is missing, outside the docs root or has an unsupported format: show missing/unknown evidence, never fabricate a pass or read an arbitrary path (Task 11).

## Approved decisions and execution recommendation

Design checkpoint: `07669a0`. Approval received through originating task `01a0d3b6-1851-7ea3-8781-1a8155141dd9`: “Looks good to me!” Do not reopen design or creation-policy approval.

Recommend **subagent-driven execution**, sequential implementer/reviewer pairs per task, because persistence mistakes can damage user-owned YAML and the 14 tasks have explicit shared contracts that benefit from independent review. Preserve the lead's integration responsibility. Do not run concurrent editors against the shared store or route files. No delegation has been started during planning. The user may instead choose native execution with one final independent branch review.

This is one integrated plan, with independently testable checkpoints, because the same persistence boundary and projection underpin every view. Stage 1 (design/mockups) is complete. Tasks 1–5 cover stage 2; Tasks 6–7 deliver stage 3; Tasks 8–13 cover stage 4; Task 14 closes stage 5. Do not stop after Overview and call the full scope complete.

## Verified implementation facts

- Current store keeps `raw` but reconstructs typed writes, mutates maps before writes, and raw-saves before parsing. `getSpecExpectations` discards missing IDs; projection must access raw relationship IDs instead.
- Dependency service checks cycles but does not currently check target existence/product scope. Phase updates can bypass transition gates. Both are covered below.
- Existing browser router uses `BrowserRouter`; `useBlocker` requires a data router. Task 6 migrates routing without changing URL patterns before relying on that hook.
- E2E helpers POST products/specs and DELETE entities against absent routes. Replace their setup/teardown with isolated filesystem fixtures; do not reintroduce unsupported API operations to make old tests pass.
- Installed IDD 1.7.1 templates verified at `/Users/jrobey/.codex/plugins/cache/grillergeek-plugins/idd-framework/1.7.1/references/authoring/{intention,expectation}-template.md`: canonical intention uses `product`, `statement`, `rationale`, lowercase `priority`, `status: draft`, `dependencies`, `expectations`, `owner`; expectation uses `intention`, `description`, `validation_criteria`, string `edge_cases`, `complexity`, `owner`, `status: draft`. Preserve/inherit resolved nonempty exploration lineage.
- Installed `skills/idd-define-expectations/references/authoring.md` requires preserving parent child IDs and adding the new expectation ID. IDs are random 4-hex, extending to 6/8 on collisions. Use fresh scans of internal IDs and filename prefixes, not numeric sequence assumptions.
- Read-only preparation probe using IDD's bundled yaml 2.8.3 preserved nested audience, comments, anchors and aliases on a scalar update, and rejected duplicate keys. No dependency was installed. Task 1 must promote this limited probe into project fixtures; it is not full write-fidelity proof.

## File and contract map

New server units:

| File | Responsibility |
| --- | --- |
| `src/server/lib/artifactDocument.ts` | Parse/edit source syntax, field mapping, identity and unsupported-field diagnostics |
| `src/server/lib/artifactFiles.ts` | Revision hashes, containment, serialized atomic single-file replacement |
| `src/server/lib/artifactTransaction.ts` | Recoverable creation/reparenting across child and parent files |
| `src/server/lib/artifactIds.ts` | Fresh-scan, collision-safe canonical IDs |
| `src/server/lib/evidenceFiles.ts` | Confined report enumeration and source lookup |
| `src/server/services/workspace.ts` | Build one product snapshot and project it |
| `src/server/services/artifactCreation.ts` | Confirmed Draft creation and reciprocal links |
| `src/server/middleware/precondition.ts` | Require exact `If-Match` revision |
| `src/server/test/workspaceFixture.ts` | Disposable byte-exact fixtures and test app |

New shared units:

| File | Responsibility |
| --- | --- |
| `src/shared/types/source.ts` | Version/source/editability metadata |
| `src/shared/types/workspace.ts` | Snapshot, projection, evidence and concern types |
| `src/shared/lib/productWorkspace.ts` | Pure scoping, unique counts and concern calculation |
| `src/shared/lib/roadmap.ts` | Placement/order/rank operations |
| `src/shared/lib/transitionEligibility.ts` | Same gate reasons for preview and authoritative transition |
| `src/shared/schemas/creation.ts` | Confirmed content and Draft-only creation requests |

New client units live under `src/client/components/workspace/`: `WorkspaceShell.tsx`, `ProgressSummary.tsx`, `OutcomeList.tsx`, `AttentionList.tsx`, `ArtifactEditor.tsx`, `ArtifactFields.tsx`, `DraftGuard.tsx`, `RoadmapBoard.tsx`, `ProductTree.tsx`, `EvidenceList.tsx`, `CreationWizard.tsx`. Each file owns its named interaction; split product/intention/expectation field components inside this directory if they become large. Hooks: `useWorkspace.ts`, `useArtifactDraft.ts`, `useCreateArtifact.ts`. Pure draft reducer/storage helper: `src/client/lib/artifactDraft.ts`. Pages: `ProductWorkspacePage.tsx`, `ProductRoadmapPage.tsx`, `ProductMapPage.tsx`, `ProductEvidencePage.tsx`, `ProductSettingsPage.tsx`.

Modify existing `yamlStore.ts`, all resource services/routes, docs routes, error handler, watcher, entity types/schemas/hooks, App/main/Layout/ProductNav, existing detail editors and FlowBoard. Preserve existing exports unless this plan explicitly changes a signature; update all callers in the same task that enforces the change.

Common contracts (define in named shared files; later task snippets use these names):

```ts
// src/shared/types/source.ts
export type ArtifactType = 'products' | 'intentions' | 'expectations' | 'specs';
export interface ArtifactRef { type: ArtifactType; id: string }
export interface SourceMeta {
  repository_id: string; // hash of canonical docs root, not a raw absolute path
  revision: string;      // quoted SHA-256 ETag of exact indexed bytes
  path: string;          // docs-relative path
  read_only_fields: Record<string, string>; // field -> reason
}
export interface Versioned<T> { data: T; source: SourceMeta }
export type Sourced<T> = T & { source: SourceMeta }; // client hooks only

// src/shared/types/workspace.ts
export interface WorkspaceConcern {
  key: string; code: string; entity: ArtifactRef; message: string;
  related: ArtifactRef[]; kind: 'attention' | 'unknown';
}
export interface EvidenceRef {
  path: string; spec_ids: string[]; expectation_ids: string[];
  kind: 'review' | 'execution' | 'gap-check' | 'pipeline' | 'other';
  availability: 'present' | 'missing' | 'unreadable' | 'outside-root';
  result: 'unknown'; recorded_at?: string;
}
export interface WorkspaceSnapshot {
  product: Versioned<Product>;
  intentions: Versioned<Intention>[];
  expectations: Versioned<Expectation>[];
  specs: Versioned<Spec>[];
  spec_expectation_ids: Record<string, string[]>;
  intention_dependency_ids: Record<string, string[]>;
  evidence: EvidenceRef[];
  diagnostics: WorkspaceConcern[];
}
export interface WorkspaceProjection extends WorkspaceSnapshot {
  active_intention_ids: string[];
  coverage: { covered_ids: string[]; uncovered_ids: string[]; total: number };
  delivery: Record<string, string[]>; // phase -> unique spec IDs
  reported_validated_ids: string[];
  concerns: WorkspaceConcern[];
  incomplete: boolean;
}
```

Import existing Product/Intention/Expectation/Spec interfaces into `workspace.ts`. Preserve normalized entities without `source` in YAML. Add optional intention `rationale`/`roadmap`, expectation `validation_criteria`/`complexity`/`deferred_reason`, and editable owner to relevant update inputs. Dependency and spec expectation ID arrays remain explicit projection fields. `RoadmapMetadata` is `{bucket?: 'now'|'next'|'later'; rank?: number; target_window?: string}`. Unsupported original values stay in source and produce diagnostics; do not cast them to supported metadata.

Source metadata travels as `meta.source` on entity/raw GET and successful writes, and `meta.sources[id]` for list responses. `apiFetch<T>` remains data-only for noneditable callers; add `apiFetchEnvelope<T>` returning `ApiResponse<T>`, and `apiFetchSourced<T>` returning `Sourced<T>`. Mutations receive the revision captured with the displayed record, never fetch a fresh revision to bless an old draft. Workspace records already contain their own `source`.

Test fixture contract introduced in Task 1:

```ts
export async function fixture(files: Record<string, string>): Promise<{
  root: string;
  store: YamlStore;
  read(relative: string): string;
  write(relative: string, text: string): void;
  revision(relative: string): string;
  dispose(): Promise<void>;
}>;
```

Use `mkdtemp` under `os.tmpdir`, create the four artifact directories, write only caller-supplied fixture files, initialize the store, and clean only that generated root. `revision` hashes exact bytes with SHA-256 and surrounding quotes. Add `testApp(root): Promise<Express>` mounting the existing routers/error handler without listening or starting a watcher; `initStore(root)` supplies their singleton. Tests needing the watcher explicitly start and stop it. Do not allow concurrent tests to share that singleton.

## Task 1: Preserve source documents and expose editability

**Files:** Create `src/server/lib/artifactDocument.ts`, its `.test.ts`, `src/server/test/workspaceFixture.ts`, `src/shared/types/source.ts`; modify `package.json`, `package-lock.json`, `src/shared/types/index.ts`.

**Interfaces:** Export `editDocument(text: string, ref: ArtifactRef, changes: Record<string, unknown>): string`, `inspectDocument(text: string, ref: ArtifactRef): {read_only_fields: Record<string,string>}`, `validateRawDocument(text: string, ref: ArtifactRef): void`. Throw typed `ArtifactError(code: string, message: string, status: number, details?: unknown)` exported here.

- [ ] Write source-fidelity tests first, including flat/wrapped forms, structured edge cases, validation groups, unknown fields, comments, quoted dates and anchored values. Pin duplicate-key and conflicting `product`/`product_id` behavior.

```ts
it('changes only the named product leaf', () => {
  const text = '# keep\nproduct:\n  id: PROD-1\n  name: Old\n  audience:\n    primary: Teams\n    secondary: Owners # preserve\n';
  const next = editDocument(text, {type:'products', id:'PROD-1'}, {name:'New'});
  expect(next).toContain('name: New');
  expect(next).toContain('secondary: Owners # preserve');
  expect(next).toContain('# keep');
});
it('rejects ambiguous form writes without destroying raw repair access', () => {
  const text = 'expectation:\n  id: EXP-1\n  description: first\n  description: last\n';
  expect(() => editDocument(text, {type:'expectations', id:'EXP-1'}, {description:'edit'}))
    .toThrow(/duplicate/i);
  expect(() => validateRawDocument('expectation:\n  id: EXP-1\n  description: fixed\n',
    {type:'expectations', id:'EXP-1'})).not.toThrow();
});
```

- [ ] Run `npx vitest run --project server src/server/lib/artifactDocument.test.ts`; confirm missing-module failures, not broken fixtures.
- [ ] Add pinned `yaml@2.8.3` and implement parsing with `parseDocument(text, {keepSourceTokens:true})`; reject errors and multiple documents. Use a field-path table, not reconstructed entity objects. Resolve the wrapper, patch the exact existing field spelling, and create canonical fields only for intentional edits. Refuse edits to structured forms the UI cannot faithfully express.

```ts
const root = doc.hasIn([singular]) ? [singular] : [];
// For each accepted changed field, resolve its existing alias/path first.
// Product vision -> existing vision or value_proposition;
// audience -> existing target_audience or audience.primary.
doc.setIn([...root, ...fieldPath], changedValue);
const next = String(doc);
validateRawDocument(next, ref);
return next;
```

Preserve existing status spelling on unrelated changes. Explicit lifecycle writes encode canonical lowercase/hyphenated values. Canonical intention `statement` is the purpose/description; derive display title from its first line unless an explicit title/name exists. Do not write a derived title over the full statement. Distinguish `rationale` from purpose. A title-only edit on a source without title is unavailable; the form explains the derived label. Never modify aliases' shared target values accidentally: anchored/aliased editable nodes are read-only until explicitly repaired in raw source. Raw repair cannot change type/ID/parent identity or spec phase/history.

- [ ] Run the focused tests and `npm run typecheck`; record any parser limitations as read-only diagnostics, not silent normalization. Existing lenient js-yaml reads of duplicate keys stay supported.
- [ ] Commit the codec, fixtures and dependency with `feat: preserve artifact source documents during edits`.

## Task 2: Commit single-file writes without stale overwrite or index drift

**Files:** Create `src/server/lib/artifactFiles.ts` and `.test.ts`; use Task 1 fixture and error type.

**Interfaces:** `sourceRevision(text: string): string`; `readArtifact(root: string, relativePath: string): {text:string; revision:string; mode:number}`; `commitArtifact({root,relativePath,expectedRevision,transform}: {root:string;relativePath:string;expectedRevision:string;transform:(text:string)=>string}): Promise<{text:string;revision:string}>`; `withProductMutation<T>(productId:string, work:()=>Promise<T>):Promise<T>`.

- [ ] Write stale-write, deleted-file, permission/rename failure, temp cleanup and symlink escape tests. Mock the filesystem rename only in the failure test; use real temp files otherwise.

```ts
it('rejects an external change after draft capture', async () => {
  const f = await fixture({'expectations/EXP-1.yaml':'expectation:\n  id: EXP-1\n  description: before\n'});
  try {
    const revision = f.revision('expectations/EXP-1.yaml');
    f.write('expectations/EXP-1.yaml','expectation:\n  id: EXP-1\n  description: outside\n');
    await expect(commitArtifact({root:f.root,relativePath:'expectations/EXP-1.yaml',expectedRevision:revision,
      transform:s=>s.replace('outside','mine')})).rejects.toMatchObject({code:'REVISION_CONFLICT'});
    expect(f.read('expectations/EXP-1.yaml')).toContain('outside');
  } finally { await f.dispose(); }
});
```

- [ ] Run `npx vitest run --project server src/server/lib/artifactFiles.test.ts` and observe the missing implementation failure.
- [ ] Implement per-file promise serialization, realpath containment and regular-file checks. Reject artifact symlinks for writes; do not replace their referents. Prepare a unique sibling `.forge-write-<random>.tmp` with `wx`, preserve mode, flush/close, recheck disk bytes, rename atomically and clean temp in `finally`. Missing revision is 428 `PRECONDITION_REQUIRED`; mismatched/deleted source is 409 `REVISION_CONFLICT`; invalid source is 422; storage failures use `WRITE_FAILED` with no success notification.

```ts
if (sourceRevision(current.text) !== expectedRevision)
  throw new ArtifactError('REVISION_CONFLICT', 'File changed outside Forge', 409);
const candidate = transform(current.text); // validation occurs before writes
// Write/flush candidate temp; re-read source and compare again before rename.
// Do not invoke an index callback before rename succeeds.
```

Add product-level queues for graph/WIP operations above the file queue; define lock order as product first, then lexicographically ordered file paths. Ordinary single-file writes do not acquire locks in reverse order. The design's external-process check-to-rename race remains documented; do not claim a filesystem transaction.

- [ ] Run focused tests, including two queued edits with the same revision (exactly one succeeds), and typecheck.
- [ ] Commit as `feat: add revision-checked atomic artifact persistence`.

## Task 3: Integrate source-safe writes with all store operations

**Files:** Modify `src/server/lib/yamlStore.ts`, `fileWatcher.ts`, `src/server/services/{product,intention,expectation,spec,intentionDependencies,phaseTransition}.ts`, resource/docs routes for revision argument plumbing, shared entity types/schemas/enums; create `src/shared/types/workspace.ts` with the common contracts above, and `src/server/lib/yamlStoreWrites.test.ts`, `src/shared/lib/transitionEligibility.ts` and `.test.ts`.

**Interfaces:** Every store mutator gains a final `expectedRevision: string` argument and becomes async; typed mutators return their existing entity/boolean result after successful reparse. `YamlStore.getSource(ref:ArtifactRef):SourceMeta|null`, `getWorkspaceSnapshot(productId:string):WorkspaceSnapshot|null`. Define `RoadmapMetadata` in `src/shared/types/intention.ts` now, using the common contract above, so optional intention metadata is typed before Task 9. Read methods return copies. `evaluateTransition(snapshot:WorkspaceSnapshot,specId:string,toPhase:string):{allowed:boolean;code?:string;message?:string;details?:unknown}` is pure and reused by transition preview and execution.

- [ ] Add tests for unknown nested data after title-only updates, raw invalid identity, linked missing IDs retained, index/history unchanged on rename failure, and phase bypass through typed and raw edits. Add two concurrent transitions into one remaining WIP slot and expect exactly one success.

```ts
it('keeps the indexed description on failed persistence', async () => {
  const f = await fixture({'expectations/EXP-1.yaml':'expectation:\n  id: EXP-1\n  description: original\n'});
  const revision = f.revision('expectations/EXP-1.yaml');
  const rename = vi.spyOn(fs.promises,'rename').mockRejectedValueOnce(new Error('disk failure'));
  try {
    await expect(f.store.updateExpectation('EXP-1',{description:'changed'},revision)).rejects.toThrow();
    expect(f.store.getExpectation('EXP-1')?.description).toBe('original');
  } finally { rename.mockRestore(); await f.dispose(); }
});
```

- [ ] Run `npx vitest run --project server src/server/lib/yamlStoreWrites.test.ts src/shared/lib/transitionEligibility.test.ts` to establish failures.
- [ ] Replace typed writer reconstruction with `editDocument` inside `commitArtifact`, then reparse returned bytes/index only after commit. Index exact bytes and revision together; do not attach a fresh disk hash to stale normalized data. Reparse malformed external changes into a visible diagnostic and mark/remove stale normalized entries so success totals are never silently current. Detect duplicate internal IDs rather than last-file-wins resolution.

```ts
const result = await commitArtifact({root:this.docsDir,relativePath,expectedRevision,
  transform:text=>editDocument(text,{type:'expectations',id},input)});
this.reloadFile(filePath);
return this.getExpectation(id);
```

Snapshot must retain orphan/dangling IDs and archived records needed for diagnostics. Normalize canonical `in-progress` to `InProgress`; add Deferred expectation support with required deferred_reason when explicitly edited. Preserve unknown legacy statuses on unrelated edits. Add owner/criteria/rationale mappings without repurposing source fields. Patch structured edge cases only when their editable representation is supported. Validate parent fields as immutable in ordinary updates; Task 12 owns explicit reparenting.

Validate dependency existence, same product, duplicates/self/cycles under the product queue. Link changes validate exact string IDs and product scope. Move every spec phase mutation, raw and typed, behind transition gates/history; raw source may repair non-phase fields but cannot edit lifecycle audit/gate-owned annotations. Capture raw restrictions with explicit UI error copy. Reevaluate WIP/checklist/gap-check/peer-review against current store under the product queue and recheck source before committing. Transition failures must not append history. Ignore own temporary/journal files in the watcher and avoid duplicate notifications for unchanged byte revisions.

- [ ] Update affected unit callers to pass captured revisions and await writes. Run `npm run test:server` and typecheck. Thread `req.get('If-Match') ?? ''` from existing resource/docs routes through services now so route signatures compile; the store rejects absent revisions. Client transport and response metadata migrate in Task 4. Tasks 3 and 4 form one release boundary: do not ship the intermediate server commit with its old UI.
- [ ] Commit as `refactor: route store mutations through safe source writes`.

## Task 4: Enforce revision preconditions through API and existing UI

**Files:** Create `src/server/middleware/precondition.ts`, `src/server/routes/artifactWrites.test.ts`, `src/client/lib/api.test.ts`; modify all resource/docs routes, error handler, `src/client/lib/api.ts`, all entity/raw/transition hooks, `YamlEditor.tsx`, `ManageLinksDialog.tsx`, `GapCheckSection.tsx`, `FlowBoard.tsx`, `InlineStatusSelect.tsx`, detail pages and `SpecEditPage.tsx`.

**Interfaces:** `requireRevision(req:Request):string` returns a single quoted hash and rejects missing, wildcard or malformed values; `apiFetchEnvelope<T>(path:string,options?:RequestInit):Promise<ApiResponse<T>>`; `apiFetchSourced<T>(path:string,options?:RequestInit):Promise<Sourced<T>>`. Mutation hook arguments gain `revision:string`; list hooks attach `meta.sources[id]` to records. Entity/raw GET and successful mutations return source metadata and ETag.

- [ ] Table-test all mutation endpoints: product/intention/expectation/spec PUT, raw PUT, spec expectations PUT, intention dependency POST/DELETE, warning acknowledgment POST, transition POST. Each rejects missing/stale revisions before changing disk. Test preserved response envelopes and 409 client errors.

```ts
const res = await request(app).put('/api/expectations/EXP-1')
  .set('If-Match','"stale"').send({description:'mine'});
expect(res.status).toBe(409);
expect(res.body.error.code).toBe('REVISION_CONFLICT');
expect(f.read('expectations/EXP-1.yaml')).toBe(original);
```

- [ ] Run `npx vitest run --project server src/server/routes/artifactWrites.test.ts` and `npx vitest run --project client src/client/lib/api.test.ts`.
- [ ] Enforce preconditions in route/service boundaries, propagate source metadata, and update all existing mutation call sites in this task. Keep source/revision transport out of mutation bodies. Capture the revision when an editor/dialog begins; a background refetch cannot replace it. Quick status/board actions use the displayed card's revision. Failed saves retain the old UI value and show a conflict, never retry with the latest revision automatically.

```ts
const {revision, id, ...changes} = variables;
return apiFetchSourced<Expectation>(`/expectations/${encodeURIComponent(id)}`, {
  method:'PUT', headers:{'If-Match':revision}, body:JSON.stringify(changes),
});
```

Return next revision on transition/link success as well as typed edits; invalidate entity, relation, product workspace and relevant list queries. Preserve ApiError details, using `new Headers(options?.headers)` rather than spreading Headers objects. Correct the existing non-JSON successful/error response handling while touching transport; tests must cover one read only. No creation API yet.

- [ ] Search `rg -n 'method:|apiFetch|fetch\(' src/client` for every write caller. Run typecheck, all unit tests, and affected existing raw-edit/transition tests once Task 7's isolated E2E harness exists; record this dependency rather than falsely claiming E2E now.
- [ ] Commit as `feat: protect every Forge edit with source revisions`.

## Task 5: Compute one trustworthy workspace projection

**Files:** Implement the shared workspace projection and `productWorkspace.test.ts`; refine `src/shared/types/workspace.ts` established in Task 3; create `src/server/services/workspace.ts`, `src/server/routes/workspace.test.ts`, `src/client/hooks/useWorkspace.ts`; modify product routes, store snapshot implementation and type exports.

**Interfaces:** `projectWorkspace(snapshot:WorkspaceSnapshot):WorkspaceProjection`; `getWorkspace(productId:string):Promise<WorkspaceProjection|null>`; `workspaceKey(id:string) => ['workspace',id]`; `useWorkspace(id:string)` returns React Query result of `WorkspaceProjection`. Register `GET /api/products/:id/workspace` before generic detail handling.

- [ ] Add empty, shared-spec, dangling/cross-product/archived-link, unknown-phase, duplicate-ID, parse-error and reported validation cases. Use explicit IDs and assert source IDs, not only totals.

```ts
const projected = projectWorkspace(snapshot);
expect(projected.coverage.covered_ids).toEqual(['EXP-1','EXP-2']);
expect(projected.delivery.Done).toEqual(['SPEC-1']); // one shared spec, not two
expect(projected.reported_validated_ids).toEqual([]); // Done is not Validated
expect(projected.coverage.uncovered_ids).toContain('EXP-3');
```

In this test, build `snapshot` using `fixture` with PROD-1, INT-1, EXP-1/2 linked to SPEC-1 Done, EXP-3 unlinked, then `store.getWorkspaceSnapshot('PROD-1')!`. Include mandatory fields in fixture YAML through a local explicit object, not casts to a fake completed state.

- [ ] Run `npx vitest run --project server src/shared/lib/productWorkspace.test.ts src/server/routes/workspace.test.ts` and observe the expected missing implementation failures.
- [ ] Scope expectations through intentions, retain contradictory annotations as concerns, index ID sets once and deduplicate phase/coverage counts. Active totals exclude archived entities; snapshot preserves inspectable inactive/broken references. Map unsupported phases to Unknown while retaining original source phase. Zero expectations has no percentage. Use the same transition evaluator for blocked-next-phase concerns; queue, missing evidence and uncovered concerns are individually keyed.

```ts
const reported = activeExpectations.filter(e=>e.data.status==='Validated').map(e=>e.data.id);
const coverage = {covered_ids:[...covered],uncovered_ids:[...uncovered],total:activeExpectations.length};
const incomplete = snapshot.diagnostics.some(d=>d.code==='PARSE_ERROR'||d.code==='DUPLICATE_ID');
```

Build snapshots from one copied index generation; do not interleave awaited per-entity reads. Evidence initially contains explicit references with unknown result; Task 11 fills document availability. Unknown/load/error responses remain distinct from empty projections. Do not attach one source revision to an entire multi-file product. Implement a named `collectWorkspaceDiagnostics(snapshot:WorkspaceSnapshot):WorkspaceConcern[]` in productWorkspace.ts; include orphan parents, contradictory product IDs, unresolved/archived relationships, duplicate source IDs and unreadable source diagnostics. Reuse it inside projectWorkspace rather than counting incomplete records as healthy.

- [ ] Run projection/API tests, typecheck and server suite. Inspect query hook to confirm one product endpoint, no child-query loop.
- [ ] Commit as `feat: project product coverage delivery and attention`.

## Task 6: Protect drafts across refetch, navigation and full-page editing

**Files:** Create `src/client/lib/artifactDraft.ts` and `.test.ts`, `src/client/hooks/useArtifactDraft.ts` and `.test.tsx`, `components/workspace/{ArtifactEditor,ArtifactFields,DraftGuard}.tsx`, `ArtifactEditor.test.tsx`; modify `main.tsx`, `App.tsx`, `test/helpers.tsx` and add `src/client/routes.tsx`.

**Interfaces:**

```ts
export interface ArtifactDraft<T> {
  ref: ArtifactRef; source: SourceMeta; baseline: T; values: T;
  dirty: boolean; external_revision?: string; recovery_unavailable: boolean;
}
export type DraftEvent<T> =
  | {type:'edit';values:T}
  | {type:'external';source:SourceMeta}
  | {type:'saved';record:Versioned<T>}
  | {type:'reload';record:Versioned<T>};
export function reduceDraft<T>(draft:ArtifactDraft<T>,event:DraftEvent<T>):ArtifactDraft<T>;
export function draftKey(ref:ArtifactRef,source:SourceMeta):string;
export function useArtifactDraft<T>(ref:ArtifactRef,record:Versioned<T>):{
  draft:ArtifactDraft<T>; change:(values:T)=>void; saved:(record:Versioned<T>)=>void;
  reload:(record:Versioned<T>)=>void; discard:()=>void;
  recovery:ArtifactDraft<T>|null; restore:(recovered:ArtifactDraft<T>)=>void;
};
```

`ArtifactEditor` receives `ref`, `record`, `onClose` and a `save(changes,revision)` callback; `ArtifactFields` renders type-specific fields and supported source shapes. `DraftGuard` owns dirty-navigation confirmation and exposes the same discard confirmation to dialog close/selection change.

- [ ] Test refetch preservation, stale revision, cross-repository recovery keys, unavailable storage, cancel/reload confirmation, focus restoration and explicit draft recovery. Build initial `ArtifactDraft` objects in pure reducer tests; use existing query test wrapper plus data-router wrapper for component tests.

```ts
const edited = reduceDraft(initial,{type:'edit',values:{description:'mine'}});
const refreshed = reduceDraft(edited,{type:'external',source:{...initial.source,revision:'"new"'}});
expect(refreshed.values.description).toBe('mine');
expect(refreshed.source.revision).toBe(initial.source.revision);
expect(refreshed.external_revision).toBe('"new"');
expect(draftKey(ref,{...initial.source,repository_id:'repo-B'}))
  .not.toBe(draftKey(ref,initial.source));
```

- [ ] Run `npx vitest run --project client src/client/lib/artifactDraft.test.ts src/client/hooks/useArtifactDraft.test.tsx src/client/components/workspace/ArtifactEditor.test.tsx`.
- [ ] Implement baseline/value separation and explicit save/reload events. Restore retains the recovered base revision and compares it with the current source; a stale recovered draft remains conflicted. Session storage stores `{version:1, ref, source, baseline, values}` under repository/entity/base-revision keys; validate recovered shape before offering Restore/Discard. Enumerate only that entity's keys to find an older-revision draft. Storage exceptions set `recovery_unavailable` and preserve in-memory data. Successful save/discard deletes prior recovery records. Never put metadata into the YAML patch; derive patches from RHF dirty fields.

```ts
case 'external': return event.source.revision===draft.source.revision
  ? draft : {...draft,external_revision:event.source.revision};
case 'saved': return {...draft,source:event.record.source,baseline:event.record.data,
  values:event.record.data,dirty:false,external_revision:undefined};
```

Move existing route definitions into exported route objects in `routes.tsx`, create a `createBrowserRouter` in main, and render `RouterProvider` inside the existing QueryClient/Toaster providers. Use `createMemoryRouter` in new navigation tests. Keep App's watcher mounted once in a root route component. Use `useBlocker` for SPA navigation, `beforeunload` for tab reload, and Radix Dialog onOpenChange/Escape/outside-click protection. Full-page “Open document” transfers the same draft key after confirmation rather than resetting state. Render MarkdownRenderer preview, read-only source-shape reasons and compare current/draft text; clipboard failure falls back to selectable draft text. No force-save button.

- [ ] Verify pending Save disables duplicate submit; 409/422/500 retains dirty fields. Run client suite and typecheck; existing route tests and direct links must still pass.
- [ ] Commit as `feat: preserve artifact drafts across workspace navigation`.

## Task 7: Deliver Overview → expand → edit → refreshed state

**Files:** Create `pages/ProductWorkspacePage.tsx`, `components/workspace/{WorkspaceShell,ProgressSummary,OutcomeList,AttentionList}.tsx`, `ProductWorkspacePage.test.tsx`, `e2e/workspace-overview.spec.ts`, `e2e/workspace-fixtures.ts`, `e2e/start-workspace-server.mjs`, `playwright.workspace.config.ts`; modify ProductNav, Layout, App/routes, `useCurrentProduct.ts`, `useFileWatcher.ts`, package scripts.

**Interfaces:** `ProductWorkspacePage` consumes `useWorkspace(productId)`. Outcome selection is `?outcome=INT-id&edit=EXP-id`; filters use `?concern=coverage|validation|review|blocked`. `WorkspaceShell` supplies product identity/nav and shared editor context to nested workspace routes. The E2E fixture exports Playwright `test`/`expect` and provides `docsRoot:string`, `seed(files:Record<string,string>):Promise<void>`, `read(relative:string):Promise<string>` and `write(relative:string,text:string):Promise<void>`.

- [ ] Write a component drilldown test plus the real first-slice browser test. Seed explicit product/intention/expectation/spec YAML in a generated temporary root; no product/spec POST.

```ts
test('edits an expectation without losing its outcome', async ({page,seed,read}) => {
  await seed({
    'products/PROD-1.yaml':'product:\n  id: PROD-1\n  name: Test product\n',
    'intentions/INT-1.yaml':'intention:\n  id: INT-1\n  product: PROD-1\n  statement: Inspect outcomes\n',
    'expectations/EXP-1.yaml':'expectation:\n  id: EXP-1\n  intention: INT-1\n  description: Original outcome\n  edge_cases: [Empty state, Failed save]\n',
  });
  await page.goto('/products/PROD-1');
  await page.getByRole('button',{name:'Expand Inspect outcomes'}).click();
  await page.getByRole('button',{name:'Edit EXP-1'}).click();
  await page.getByLabel('Measurable outcome').fill('Updated outcome');
  await page.getByRole('button',{name:'Save expectation'}).click();
  await expect(page.getByRole('button',{name:'Collapse Inspect outcomes'})).toBeVisible();
  await expect(page.getByText('Updated outcome',{exact:true})).toBeVisible();
  expect(await read('expectations/EXP-1.yaml')).toContain('Updated outcome');
});
```

- [ ] Run `npx vitest run --project client src/client/pages/ProductWorkspacePage.test.tsx`; then `npx playwright test -c playwright.workspace.config.ts e2e/workspace-overview.spec.ts` and confirm absent workspace behavior fails before implementation.
- [ ] Replace product detail root with Overview and preserve `/products/:id/edit` as settings/edit entry. Header edits product; outcome expansion edits expectation in two clicks. Render loading/error/incomplete/empty separately, never turn an error into zero. Every summary/concern opens supporting IDs; preserve expansion/scroll on save. Surface status as “Reported validated · evidence unknown” where appropriate. Fetch one workspace response, render rows without child queries. Apply approved neutral/green design using existing Tailwind/shadcn tokens, preserving semantic phase colors.

```tsx
<Button aria-expanded={expanded} aria-controls={`outcome-${id}`}
  aria-label={`${expanded?'Collapse':'Expand'} ${title}`} onClick={toggle}>
  {title}
</Button>
{expanded && <section id={`outcome-${id}`}>{expectationRows}</section>}
```

Workspace editor mutations use the captured expectation revision and invalidate `workspaceKey(productId)` after success. SSE marks drafts externally changed and refetches the workspace. Product resolution on standalone intention/expectation/spec URLs follows fetched parent IDs so persistent product navigation is retained; do not guess from last selected product.

E2E harness: one dedicated production server on port 4181 with `FORGE_DOCS` pointing to a generated temp root, `reuseExistingServer:false`, `workers:1` initially. `start-workspace-server.mjs` creates the temp root, writes its path to a temp marker supplied via `FORGE_E2E_STATE`, launches the built server, forwards signals and removes only its generated root on shutdown. Tests read that marker and seed through filesystem; verify containment in helpers. Test config creates a unique marker path in OS temp, passes it to webServer and tests; no shared hardcoded docs directory. Use `npm run build` before this config. Add package script `test:e2e:workspace` that builds and runs this config. Verify seed completion through health/workspace polling, not arbitrary sleeps.

- [ ] Run typecheck, client tests, build, and the first-slice E2E. Verify actual disk content on save; record screenshot at desktop and mobile. This checkpoint is the first complete useful product slice.
- [ ] Commit as `feat: add product overview with contextual expectation editing`.

## Task 8: Consolidate artifact editing and product settings

**Files:** Create `ProductSettingsPage.tsx`, `components/workspace/ProductFields.tsx`, `IntentionFields.tsx`, `ExpectationFields.tsx`, `ArtifactEditing.test.tsx`, `e2e/workspace-editing.spec.ts`; modify existing product/intention/expectation detail pages/forms, SpecEditPage/SpecForm, YamlEditor, ProductNav and routes.

**Interfaces:** Type-specific fields implement the `ArtifactFields` contract and consume source editability. `ArtifactEditor` supports dialog/full-page presentation using the same draft hook and revision. Ordinary update payloads include only changed known fields; parent changes use Task 12's explicit operation.

- [ ] Add title-only editing of a structured expectation without edge-case flattening; owner and rationale edits; Markdown preview; full-page draft transfer; failed raw-save preservation. Test raw lifecycle bypass is rejected with visible explanation.

```ts
await user.click(screen.getByRole('button',{name:'Preview'}));
expect(screen.getByText('Measurable result').tagName).toBe('STRONG');
expect(save).toHaveBeenCalledWith({owner:'Product owner'}, '"base"');
```

Use `**Measurable result**` as the explicit description fixture; assert rendered `strong` element via text (there is no ARIA strong role). The `save` spy is the editor's callback. Unchanged structured edge cases must not appear in its patch.

- [ ] Run `npx vitest run --project client src/client/components/workspace/ArtifactEditing.test.tsx` and focused E2E to establish failures.
- [ ] Implement shared field rendering: product name/problem/vision/audience/owner/status, separate technical-context and WIP settings; intention purpose/rationale/priority/owner/status/dependencies; expectation description/validation criteria/owner/complexity/status/edge cases. Use shared Zod validation for changed fields so incomplete legacy artifacts can receive unrelated safe edits. Preserve unknown status options as read-only until explicitly replaced. Deferred expectations require a reason. Raw YAML remains Advanced with the same conflict and dirty-state guards. Long spec documents retain their editor but use the shared draft/safe-save pipeline.

```ts
const patch = Object.fromEntries(Object.entries(values)
  .filter(([key])=>dirtyFields[key as keyof typeof dirtyFields]));
await save(patch, draft.source.revision);
```

Show unsupported structured fields read-only with source link. Do not leave old inline mutation paths with distinct draft behavior. Keep existing bookmarks and edit URLs functional; redirect only after preserving/confirming dirty state. Settings belong in the workspace secondary navigation; global My Work/Plans/Reviews remain accessible.

- [ ] Run client suite, typecheck, affected edit/raw/Markdown E2E and build. Verify product nested secondary audience survives editing primary audience.
- [ ] Commit as `feat: unify artifact editing and product settings`.

## Task 9: Add independent roadmap placement and ordering

**Files:** Create `src/shared/lib/roadmap.ts` and `.test.ts`, `pages/ProductRoadmapPage.tsx`, `components/workspace/RoadmapBoard.tsx`, `RoadmapBoard.test.tsx`, `e2e/workspace-roadmap.spec.ts`; modify intention schema/types/codec/hooks, workspace projection and routes.

**Interfaces:** `readRoadmap(value:unknown):{metadata:RoadmapMetadata|null;unsupported:boolean}`; `rankBetween(before:number|null,after:number|null):number`; `sortIntentions(records:Versioned<Intention>[]):Versioned<Intention>[]`. Extend intention PUT with `roadmap:{bucket?:'now'|'next'|'later'|null;rank?:number;target_window?:string|null}`; null bucket clears bucket/rank and preserves target_window plus unrelated forge keys.

- [ ] Test absent metadata => Unscheduled, unchanged phase/status, deterministic duplicate ranks, finite-rank checks, precision exhaustion, explicit target windows and invalid dependency target/cycle. Exercise keyboard Move and Move before/after controls.

```ts
expect(rankBetween(1024,2048)).toBe(1536);
expect(()=>rankBetween(1,1+Number.EPSILON)).toThrow(/precision/i);
const saved = editDocument(text, {type:'intentions',id:'INT-1'},
  {roadmap:{bucket:'next',rank:1024}});
expect(saved).toContain('status: fulfilled');
expect(saved).toContain('custom_extension: keep');
```

- [ ] Run focused roadmap unit/component tests and `e2e/workspace-roadmap.spec.ts` to verify failures before code.
- [ ] Implement menu/keyboard movement first; drag-and-drop is optional and cannot be the only interaction. Rank midpoint between finite neighbors, use +/-1024 at an end and 1024 for the first card; if no representable finite rank exists, return actionable `ROADMAP_RANK_EXHAUSTED`. Never rewrite an entire column to make a single move succeed. Tie break by ID. Display unsupported metadata with an explicit replacement action; do not auto-fix on read. Active sorting uses bucket, finite rank, priority then ID for unranked values. Include explicit completed/archived filters; don't move artifacts based on status.

```ts
const rank = before===null ? (after===null?1024:after-1024)
  : after===null ? before+1024 : before+(after-before)/2;
if (!Number.isFinite(rank) || (before!==null && rank<=before) || (after!==null && rank>=after))
  throw new Error('Roadmap rank precision exhausted; choose a different position.');
return rank;
```

A move checks the edited intention revision; concurrent neighbor movement may produce equal ranks, handled deterministically and refreshed visibly rather than a multi-file transaction. Show rationale and exact dependency status; dependencies do not invent delivery gates or target dates.

- [ ] Run focused suites plus typecheck/build and roadmap E2E with disk reload assertions. Verify unrelated source extension fields survive.
- [ ] Commit as `feat: add independent product roadmap planning`.

## Task 10: Connect the product map and delivery board

**Files:** Create `pages/ProductMapPage.tsx`, `components/workspace/ProductTree.tsx`, `ProductTree.test.tsx`, `e2e/workspace-delivery.spec.ts`; modify FlowBoardPage, FlowBoard, SpecCard, SpecDetailPage, workspace projection and routes.

**Interfaces:** `ProductTree({workspace,filter,onEdit}:{workspace:WorkspaceProjection;filter:string;onEdit:(ref:ArtifactRef)=>void})`; Delivery query `?outcome=INT-id` filters IDs from workspace relationships, not a separate fuzzy text search. `evaluateTransition` supplies reason/code/details for preview and the transition service remains authoritative.

- [ ] Test shared spec appears under both expectations but unique delivery count is one, broken IDs are visible, search retains ancestors, direct intention links are distinct, archived references remain inspectable and Done never adds validated coverage. Browser test a blocked transition and corrective link.

```ts
renderWithProviders(<ProductTree workspace={workspace} filter="EXP-2" onEdit={vi.fn()}/>);
expect(screen.getByText('Parent outcome')).toBeVisible();
expect(screen.getByText('EXP-2')).toBeVisible();
expect(screen.queryByText('Unrelated outcome')).not.toBeInTheDocument();
```

- [ ] Run `npx vitest run --project client src/client/components/workspace/ProductTree.test.tsx` and focused delivery E2E.
- [ ] Render nested lists with disclosure buttons and connector styling, not a canvas. Maintain collapsed state by ID, paginate children in groups of 50 with “Show more”, and keep filtered ancestors expanded. Provide expectation edits through the same panel. Direct intention→spec links have a separate labeled branch. Missing IDs render literal ID plus actionable concern. Group the board by selected outcome and preserve ungrouped view; shared specs list all linked outcomes. Do not duplicate WIP counts when filtering: gates always use whole-product counts.

```tsx
<ul aria-label="Product relationships">
  {visibleIntentions.map(record=><li key={record.data.id}>
    <Button aria-expanded={expanded.has(record.data.id)} onClick={()=>toggle(record.data.id)}>
      {record.data.title}
    </Button>
    {expanded.has(record.data.id) && <ul aria-label={`${record.data.id} expectations`}>{children}</ul>}
  </li>)}
</ul>
```

Inline gate explanations link to checklist fields, gap-check report, review or WIP column. Preserve existing override reasons/history and keyboard DnD. Don't add a new dependency gate. Keep `/products/:id/board`, standalone spec details and metrics links working.

- [ ] Run all affected board/checklist/gap-check tests and browser flows, plus typecheck. Verify server denial still wins if state changes after preview.
- [ ] Commit as `feat: connect product intent map with delivery`.

## Task 11: Expose evidence without inferring validation

**Files:** Create `src/server/lib/evidenceFiles.ts` and `.test.ts`, `pages/ProductEvidencePage.tsx`, `components/workspace/EvidenceList.tsx`, `EvidenceList.test.tsx`, `e2e/workspace-evidence.spec.ts`; modify docs/metrics routes, `useReviews.ts`, workspace service/projection and routes.

**Interfaces:** `listEvidence(root:string,specs:Spec[]):Promise<EvidenceRef[]>`; `readEvidence(root:string,relativePath:string):Promise<string>`; `GET /api/products/:id/evidence?path=<encoded docs-relative path>` validates that the path is an enumerated product evidence reference before reading. Keep global Reviews/Plans links for unassociated files.

- [ ] Test exact ID filename matching (`SPEC-1` must not claim `SPEC-10-review`), missing gap-check report, path traversal/symlink escape, unreadable file, unsupported report format and date absent. All evidence results remain unknown unless a separately fixture-backed expectation-level schema is implemented; this plan adds no such parser.

```ts
const rows = await listEvidence(root,[spec]);
expect(rows.find(r=>r.path==='reviews/SPEC-1-review.md')?.result).toBe('unknown');
expect(rows.find(r=>r.path==='reviews/SPEC-10-review.md')).toBeUndefined();
await expect(readEvidence(root,'../outside.md')).rejects.toMatchObject({code:'INVALID_PATH'});
```

- [ ] Run `npx vitest run --project server src/server/lib/evidenceFiles.test.ts` and the EvidenceList client test.
- [ ] Enumerate regular in-root reports by exact known spec ID and established suffix conventions. Include explicit gap-check/report references even when missing. Reuse pipelineMetrics for metrics, and link its source spec histories/reports; pipeline summaries are not expectation validation. Resolve encoded paths once and validate both lexical and realpath containment. Return no HTML execution from reports; MarkdownRenderer renders prose without raw HTML. Harden existing touched review/plan read routes with the same contained-path helper so a new link cannot expose arbitrary files. Surface unreadable/missing references and no-evidence empty states.

```ts
const suffix = name.startsWith(`${spec.id}-`) ? name.slice(spec.id.length+1) : null;
const kind = suffix === null ? null : classifyEvidenceSuffix(suffix);
// null excludes an unrelated ID; an unrecognized same-ID suffix returns 'other'.
```

Define `classifyEvidenceSuffix(suffix:string):EvidenceRef['kind']` inside evidenceFiles and share/move the existing `classifyReviewName` naming logic into a shared helper only if both client and server need it. Do not duplicate incompatible matching rules. Dates come from explicit recognized timestamps only; omit otherwise.

- [ ] Run unit tests, evidence browser drilldown, typecheck and build. Verify no prose/filename is used as proof of expectation pass.
- [ ] Commit as `feat: add source-linked product evidence view`.

## Task 12: Create canonical Draft artifacts with reciprocal links

**Files:** Create `src/server/lib/{artifactIds,artifactTransaction}.ts` and tests, `src/server/services/artifactCreation.ts` and `.test.ts`, `src/shared/schemas/creation.ts` and `.test.ts`; modify intention/expectation routes, startup/store/watcher, codec, shared creation inputs and source metadata handling.

**Interfaces:**

```ts
export interface CreateIntentionDraft {
  product_id:string; statement:string; rationale:string;
  priority:'critical'|'high'|'medium'|'low'; owner:string; confirmed:true;
}
export interface CreateExpectationDraft {
  intention_id:string; description:string; validation_criteria:string;
  edge_cases:string[]; complexity:'low'|'medium'|'high'; owner:string;
  confirmed_edge_cases:true; confirmed:true;
}
export function allocateArtifactId(root:string,type:'intentions'|'expectations'):Promise<string>;
export interface FileChange {
  path:string; expectedRevision:string|null; // null means must not exist
  text:string;
}
export function commitArtifactSet(root:string,changes:FileChange[]):Promise<void>;
export function recoverArtifactTransactions(root:string):Promise<WorkspaceConcern[]>;
export function createIntentionDraft(input:CreateIntentionDraft,parentRevision:string):Promise<Versioned<Intention>>;
export function createExpectationDraft(input:CreateExpectationDraft,parentRevision:string):Promise<Versioned<Expectation>>;
```

POST `/api/intentions` and `/api/expectations` require If-Match of the selected parent; return 201 `{data, error:null, meta:{source}}` for the new entity. No caller-supplied ID/status and no product/spec creation/deletion APIs. Add explicit `POST /api/expectations/:id/reparent` with `{intention_id, old_parent_revision, new_parent_revision}` and child's If-Match for same-product relationship changes; use the same transaction unit, preserve child ID/content/status, and update old/new parent lists. Cross-product reparenting is rejected.

- [ ] Test canonical lowercase fields, separate criteria, inherited nonempty exploration, required owner/complexity, distinct trimmed edge cases, missing confirmation, filename/internal-ID collisions, parent changed since review, duplicate parent IDs, failed second write, restart recovery and safe reparenting. Include concurrent create requests selecting the same parent.

```ts
expect(createExpectationDraftSchema.safeParse({
  intention_id:'INT-1',description:'Outcome',validation_criteria:'Observable pass/fail',
  edge_cases:['same',' same '],complexity:'low',owner:'Owner',
  confirmed:true,confirmed_edge_cases:true,
}).success).toBe(false);
// After inducing failure on parent replacement:
expect(f.read('intentions/INT-1.yaml')).toBe(parentBefore);
expect(fs.existsSync(path.join(f.root,'expectations',`${newId}.yaml`))).toBe(false);
```

Use injected deterministic random bytes in artifactIds tests to force collisions; source IDs from successful creation results in service tests. Failure injection occurs through mocked rename on the parent only, after the new child was written. Do not rely on wall-clock timing.

- [ ] Run the new creation/schema/transaction suites and establish failure before implementation.
- [ ] Export `createIntentionDraftSchema` and `createExpectationDraftSchema` from `creation.ts`, using the request shapes above with strict objects, trimmed nonempty strings and an array refinement for distinct trimmed edge cases. Implement allocation using crypto random bytes (4, then 6, then 8 hex after five collisions per size), scanning live internal IDs and canonical filename ID prefixes including slug suffixes. Skip no malformed or duplicate-ID ambiguity silently: block creation in affected namespace with an actionable diagnostic. Exclusive creation `wx` retries collisions, never truncates files. Verify parents are live, same-product and unchanged from reviewed bytes. Compose canonical wrapper documents with the fields verified above, not legacy Forge-only shape; no invented created/approval evidence. Product intention-list additions, intention expectation-list additions and inherited lineage preserve all unrelated fields.

```ts
const entity = {expectation:{id,intention:input.intention_id,
  description:input.description,validation_criteria:input.validation_criteria,
  edge_cases:input.edge_cases,complexity:input.complexity,owner:input.owner,status:'draft'}};
```

Creation/reparenting holds the product queue and ordered file locks. Prepare and validate all candidate files first. Write a mode-0600 recovery record under `docs/.forge-transactions/<random>.json` containing paths, original bytes/revisions/modes and proposed hashes; watcher/scanner ignore this directory. Exclusively write the new child, then revision-check/replace parent candidates. Only index/broadcast success after all commits. On failure, restore/unlink only files whose current bytes still equal this operation's proposed bytes. Never overwrite intervening external edits during rollback. If safe rollback cannot finish, retain the recovery record, return `RECOVERY_REQUIRED`, and expose exact affected paths; disable mutations on those paths until recovery. On startup before indexing, attempt the same hash-checked rollback of incomplete records, preserving external changes and reporting unresolved cases. Remove successful transaction records. Document that cross-process readers can observe an intermediate state; this is recoverable multi-file persistence, not a filesystem atomic transaction.

- [ ] Run all server suites, creation/reparent conflict tests and typecheck. Read saved bytes back and load them using the fixture codec/store; assert exact reciprocal IDs and no promoted parent status. Update CLAUDE.md's view/edit-only rule to the approved two-type Draft creation policy in this task.
- [ ] Commit as `feat: safely create canonical draft intentions and expectations`.

## Task 13: Guide users through confirmed Draft creation

**Files:** Create `components/workspace/CreationWizard.tsx` and `.test.tsx`, `hooks/useCreateArtifact.ts`, `e2e/workspace-creation.spec.ts`; modify workspace pages, shared fields, relation controls and README.

**Interfaces:** `CreationWizard({type,parent,onCreated,onClose})` accepts `type:'intentions'|'expectations'`, `parent:Versioned<Product|Intention>` and retains its original revision through Review/Create. `useCreateArtifact(type)` takes `{input,parentRevision}` and returns the new sourced entity. `onCreated(ref)` opens the new artifact after verified success.

- [ ] Test selected-parent visibility, outcome/criteria inputs, two explicit edge-case confirmations, invalid/duplicate cases, review step, pending double submit, failed parent conflict retaining all fields, successful navigation and no lifecycle advancement.

```ts
await page.getByRole('button',{name:'New expectation'}).click();
await page.getByLabel('Measurable outcome').fill('Owners can inspect evidence');
await page.getByLabel('Validation criteria').fill('Each progress count opens its source records');
await page.getByLabel('Edge case 1').fill('Missing report is labeled unknown');
await page.getByLabel('Edge case 2').fill('Shared spec is counted once');
await page.getByLabel('Owner',{exact:true}).fill('Product owner');
await page.getByLabel('Complexity').selectOption('low');
await page.getByLabel('I confirm these edge cases').check();
await page.getByRole('button',{name:'Review draft'}).click();
await expect(page.getByText('Status: Draft',{exact:true})).toBeVisible();
await page.getByRole('button',{name:'Create draft'}).click();
```

Use a native/select-compatible control or adapt the Playwright selection to the actual shadcn combobox; do not change the product component solely to satisfy a test selector.

- [ ] Run wizard unit tests and `e2e/workspace-creation.spec.ts` to confirm the flow is absent before implementation.
- [ ] Implement intention Purpose → Details → Review and expectation Outcome → Edge cases → Review. Parent selection is constrained to current product and read-only during review unless the user goes Back. Show exact Markdown preview and confirmed fields, lowercase persistence is an implementation detail; UI displays Draft. Editing edge cases invalidates prior confirmation. Recovery uses Task 6 draft protection; review approval is explicit submit, never AI-generated content or automatic advancement. On parent conflict, retain content and require reviewing refreshed parent context before re-submitting with its new revision. Return to the originating outcome and expand the newly created expectation on success.

```ts
return apiFetchSourced<Expectation>('/expectations',{
  method:'POST',headers:{'If-Match':parentRevision},
  body:JSON.stringify({...input,confirmed:true,confirmed_edge_cases:true}),
});
```

Expose same-product parent change in expectation relationships with review of affected links, using Task 12's reparent endpoint and all captured revisions. Spec links and intention dependencies keep their existing validated endpoints. Product/spec creation/deletion remains absent. Update README with source-of-truth, creation confirmation, conflict recovery and evidence semantics.

- [ ] Run wizard/E2E cases with saved-file and parent-backlink assertions; verify errors never clear input. Run client suite/typecheck/build.
- [ ] Commit as `feat: guide confirmed draft outcome creation`.

## Task 14: Verify the full workspace and close regressions

**Files:** Create `e2e/workspace-safety.spec.ts`, `workspace-accessibility.spec.ts`, `workspace-large-data.spec.ts`, `docs/superpowers/reports/2026-09-24-product-workspace-verification.md`; modify `e2e/helpers.ts`, all affected stale CRUD E2E files, `playwright.config.ts`, test fixtures and README/CLAUDE.md/implementation-status as necessary to describe shipped behavior accurately.

**Interfaces:** Reuse the disposable E2E fixtures from Task 7 and real API/file behavior. Legacy helper `createProduct/createSpec/deleteEntity` names may remain only as test fixture filesystem operations; do not imply they are supported product APIs. Migrate legacy tests into the isolated config and remove the unsafe real-docs default.

- [ ] Add browser regressions for external edits during dirty form, failed network save/retry, malformed YAML from outside, deletion while editing, missing evidence, stale board transition, recovery after reload, keyboard focus, 390/1024/1440 widths and large data. Pin five Review Focus items to the owning unit tests above and exercise observable cross-layer consequences here.

```ts
test('external file update protects the visible draft',async({page,seedWorkspace,write,read})=>{
  await seedWorkspace();
  await page.goto('/products/PROD-1');
  await page.getByRole('button',{name:'Expand Inspect outcomes'}).click();
  await page.getByRole('button',{name:'Edit EXP-1'}).click();
  await page.getByLabel('Measurable outcome').fill('Local draft');
  const path='expectations/EXP-1.yaml';
  await write(path,(await read(path)).replace('Original outcome','External outcome'));
  await expect(page.getByText('File changed outside Forge')).toBeVisible();
  await expect(page.getByLabel('Measurable outcome')).toHaveValue('Local draft');
  expect(await read(path)).toContain('External outcome');
});
```

Add `seedWorkspace():Promise<void>` to `workspace-fixtures.ts`, calling its existing `seed` helper with the exact three product/intention/expectation YAML documents from Task 7. For failed-save E2E, abort one PUT with Playwright routing, verify retained draft, remove route then retry; real rename/permission errors are covered by Task 2/3 tests.

- [ ] Run the new regressions before fixing discovered issues, preserving failure screenshots/traces only in test output directories.
- [ ] Fix only observed gaps. Native keyboard tests traverse workspace nav, expand rows, open editor, trap Tab/Shift-Tab, Escape with dirty confirmation, and restore focus to Edit. Check label/error associations, aria-live save/error announcements, semantic state labels, reduced-motion behavior and mobile scrolling with Save/Cancel reachable. Do not claim an automated contrast check proves accessibility; manually inspect contrast/focus at the three sizes.

```ts
for (const width of [1440,1024,390]) {
  await page.setViewportSize({width,height:900});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
}
```

Large-data fixture generates 100 intentions, 10 expectations each and 1,000 specs with deterministic links; intercept/count requests and verify no per-row artifact fetches after workspace load. Assert branches initially collapsed and Show more reveals the next page without losing selection. Record measured initial load and expand times in the verification report without asserting an invented performance SLA. Use explicit seeded names and deterministic ordering.

- [ ] Run `npm run typecheck`, `npm test`, `npm run build`, `npm run test:e2e:workspace` and the migrated legacy suite using the same disposable root. Every changed E2E file must run. Record commands, counts, failure fixes and any remaining environmental limitation; do not label an unrun test passing. Re-run broadened checks only after new changes/failures justify them.
- [ ] Perform a whole-branch independent review using the selected execution workflow. Fix actionable findings and rerun affected checks. Record final diff/status, confirm only intended source/docs changed and real product YAML is untouched, then commit `test: verify product workspace workflows and regressions`. Do not publish, merge or deploy. Report outcome and artifact paths to the originating task.

## Verification command ladder

Install project dependencies during execution with `npm ci` on the existing lockfile before Task 1's dependency change; use Node >=20. Browser installation only if Playwright reports it missing. Dependency/network permissions are environment mechanics, not another product-design approval.

```bash
npm run typecheck
npm run test:server
npm run test:client
npm run build
npm run test:e2e:workspace
```

Focused tests in each task are red/green implementation checks. The command ladder is the final integration gate, not a substitute for real browser/disk assertions. Until Task 7 introduces the isolated harness, do not run legacy E2E against the checked-in docs root.

## Coverage and self-review

| Approved requirement | Owner tasks |
| --- | --- |
| Design/mockups and representative tasks | Completed checkpoint 07669a0; usability follow-through 7, 14 |
| Preserved source, invalid links, concurrent edits, safe failures | 1–4, 6, 12, 14 |
| Honest coverage/delivery/reported validation/attention | 5, 7, 11 |
| Persistent navigation and full-page/context editor | 6–8 |
| Overview complete first slice | 7 |
| Optional metadata, planning order/dependencies/windows | 9 |
| Connected map and missing implementation coverage | 5, 10 |
| Existing board/gates, outcome grouping, corrective actions | 3–4, 10 |
| Evidence/review/execution/pipeline sources | 11 |
| Consistent description/priority/owner/criteria/relationships edits | 3–4, 8–10, 12–13 |
| Approved Draft intention/expectation creation | 12–13 |
| Accessibility/responsive/larger data and actual E2E | 7, 14 |
| Repo-local compatibility and truthful delivery report | All tasks; final report in 14 |

Self-review checks: every spec section maps above; each new contract has a producer and named consumers; five Review Focus risks have explicit tests; no human-validation evidence is inferred; source metadata is never serialized into artifacts; raw saves cannot bypass lifecycle gates. The transaction recovery mechanism is scoped to the approved reciprocal-link creation/editing work. The only next human decision is implementation-plan review and execution-method selection.

## Execution handoff

Review this plan, then select **subagent-driven** (recommended: sequential implementer/reviewer per task plus whole-branch review) or **native** (lead implements tasks here, then a fresh whole-branch reviewer). Approval of the design and creation policy is already recorded. Implementation starts after this plan review; do not ask again about the approved scope.
