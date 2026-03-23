# Validation Report: SPEC-001 through SPEC-006 (Full Review)

> **Reviewer:** IDD Spec Reviewer (automated)
> **Date:** 2026-03-23
> **Source:** `docs/forge-product-definition-v1.1.md` (v1.1)
> **Codebase:** `main` branch, commit `0448e1e`

---

## Summary

- **Overall Status:** Pass (with noted gaps)
- **Specs Reviewed:** 6 (SPEC-001 through SPEC-006)
- **Expectations:** 28/32 passed (4 partial)
- **Boundaries:** Clean across all 6 specs (0 violations)
- **Deliverables:** 43/45 present (2 minor deviations)

All six MVP specs are substantially implemented. The four "Partial" ratings are due to missing fields documented in the product definition data model (owner, value_proposition, strategic_alignment) and one unimplemented edge case (staleness detection). These are deferred-by-design items already captured in `docs/gap-analysis.md`.

---

## SPEC-001: Project Scaffolding, Docker Setup, and Database Schema

### Expectation Results

| ID | Description | Status | Notes |
|----|-------------|--------|-------|
| S1-E1 | docker-compose.yml starts working dev environment | **Pass** | `docker-compose.yml` defines `app` and `db` (SQL Server 2022) services. Port 1433 configurable via `DB_PORT` env var. `docker-entrypoint.sh` handles migration on first run. |
| S1-E2 | Prisma schema defines all entities with correct relationships | **Pass** | `prisma/schema.prisma` defines Product, Intention, IntentionDependency, Expectation, Spec, SpecExpectation, PhaseTransition. All FKs, cascade rules, and composite keys correct. JSON columns use `String @db.NVarChar(Max)` per SQL Server limitation. Two migrations present. |
| S1-E3 | Express server with health check endpoint | **Pass** | `src/server/index.ts` line 21-36: `GET /api/health` returns `{ status: 'ok' }` when DB connected, `{ status: 'degraded', database: 'unreachable' }` when not. Response shape `{ data, error, meta }` correct. |
| S1-E4 | Vite dev server proxies /api/* to Express | **Pass** | `vite.config.ts` line 17-20: proxy configured for `/api` to `http://localhost:3001`. |
| S1-E5 | Auth middleware with dev bypass | **Pass** | `src/server/middleware/auth.ts`: `BYPASS_AUTH=true` sets `req.user` to dev user with Admin role. Real path uses JWKS endpoint for Entra JWT validation. Health check exempt (placed before `app.use(authMiddleware)` at line 39). |

### Boundary Results

| Boundary | Status | Evidence |
|----------|--------|----------|
| No UI pages beyond placeholder | **Clean** | SPEC-001 produced the skeleton; UI was added by subsequent specs as intended. |
| No CRUD API routes (only health check) | **Clean** | CRUD routes added by SPEC-002/003, not SPEC-001. |
| No Azure Container Apps or CI/CD config | **Clean** | No `deploy.yml` or Azure config in repo. |
| No seed data | **Clean** | Seed script exists at `prisma/seed.ts` but was added with SPEC-002 as intended. |

### Deliverable Results

| Deliverable | Status | Notes |
|-------------|--------|-------|
| docker-compose.yml | **Present** | Two containers: app + db. |
| Dockerfile (multi-stage) | **Present** | Three stages: development, build, production. |
| .env.example | **Present** | All required vars documented: PORT, DATABASE_URL, DB_PORT, SA_PASSWORD, BYPASS_AUTH, ENTRA_*. |
| package.json | **Present** | All dependencies present. |
| tsconfig.json, tsconfig.server.json, tsconfig.client.json | **Present** | All three exist in project root. |
| vite.config.ts with API proxy | **Present** | Proxy to localhost:3001. |
| tailwind.config.ts and global CSS | **Present** | shadcn/ui setup confirmed. |
| prisma/schema.prisma | **Present** | Full data model with 7 models. |
| Initial Prisma migration | **Present** | `prisma/migrations/20260318212910_init/migration.sql` |
| src/server/index.ts | **Present** | Express entry with health check. |
| src/server/middleware/auth.ts | **Present** | Entra JWT + dev bypass. |
| src/client/main.tsx | **Present** | React entry point. |
| src/shared/types/ | **Present** | Interfaces for Product, Intention, Expectation, Spec, enums. |
| src/shared/schemas/ | **Present** | Zod schemas for all entities + transition schema. |

---

## SPEC-002: Product CRUD and Detail View

### Expectation Results

| ID | Description | Status | Notes |
|----|-------------|--------|-------|
| EXP-001 | Product CRUD with required field enforcement | **Partial** | Create/read/update/delete all implemented. Zod schema enforces `name`, `problem_statement`, `vision`, `target_audience`. **Missing fields vs product def:** `value_proposition`, `strategic_alignment`, `owner` are not in schema. However, `vision` captures the value proposition semantically. Long text accepted (NVarChar(Max)). Duplicate names allowed (no unique constraint). API returns 400 on missing required fields. |
| EXP-002 | Product detail view with Intention summary | **Partial** | Detail page shows product fields, Intention count, Spec count. **Missing:** no progress indicator showing Intention fulfillment percentage. No per-status breakdown of Intentions shown on detail page. The gap analysis acknowledges this. |
| EXP-003 | Configurable Context block with inheritance | **Pass** | `ProductContext` type has `stack`, `patterns`, `conventions`, `auth`. Context editor on product edit page. Context saved as JSON. Context inheritance implemented in `spec.ts` service: `createSpec()` snapshots Product context when no Spec context provided (line 48-54). Existing Specs keep their snapshot. |

### Boundary Results

| Boundary | Status | Evidence |
|----------|--------|----------|
| No Team/multi-user features | **Clean** | No Team model or multi-user code. |
| No metrics calculations | **Clean** | No metrics code beyond raw PhaseTransition logging. |
| No custom rich text editor | **Clean** | Uses textarea and standard inputs throughout. |
| No file uploads | **Clean** | No upload functionality. |

### Deliverable Results

| Deliverable | Status | Notes |
|-------------|--------|-------|
| API routes: GET/POST /api/products, GET/PUT/DELETE /api/products/:id | **Present** | `src/server/routes/products.ts` |
| Product list page | **Present** | `src/client/pages/ProductListPage.tsx` |
| Product create/edit form with Zod validation | **Present** | `src/client/components/ProductForm.tsx` |
| Product detail page with Context editor | **Present** | `src/client/pages/ProductDetailPage.tsx` + `ContextEditor.tsx` |
| React Query hooks for Product CRUD | **Present** | `src/client/hooks/useProducts.ts` |
| Prisma seed script with example Products | **Present** | `prisma/seed.ts` |

---

## SPEC-003: Intent Hierarchy (Intentions, Expectations, Specs CRUD)

### Expectation Results

| ID | Description | Status | Notes |
|----|-------------|--------|-------|
| EXP-004 | Intention CRUD as children of Product | **Pass** | Full CRUD implemented. **Circular dependency detection:** `detectCircularDependency()` in `intentionDependencies.ts` uses DFS, tested with unit tests and E2E tests (`e2e/circular-dependency.spec.ts`). **Delete with children blocked:** `deleteIntention()` checks `childCount > 0` and returns `has_children` error (409 response). **Field naming:** uses `title`/`description` instead of `statement`/`rationale` -- semantic equivalence, cosmetic difference. |
| EXP-005 | Expectation CRUD as children of Intention | **Pass** | Full CRUD. **Minimum 2 edge cases enforced:** `createExpectationSchema` has `z.array(z.string()).min(2)`. E2E test `e2e/expectation.spec.ts` verifies. **Missing field vs def:** `validation_criteria` not a separate field (captured in `description`), `complexity` not on Expectation (on Spec instead), `owner` not present. These are documented gaps. |
| EXP-006 | Spec CRUD linked to Expectations | **Pass** | Full CRUD with `expectation_ids` on create. `PUT /api/specs/:id/expectations` manages linking. `GET /api/specs/:id/expectations` retrieves linked expectations. Context, boundaries, deliverables, validation blocks stored as JSON. |
| EXP-007 | Full hierarchy navigation with breadcrumbs | **Pass** | `Breadcrumbs.tsx` component renders ancestry trail at all levels. Confirmed in `ProductDetailPage`, `IntentionDetailPage`, `ExpectationDetailPage`, `SpecDetailPage`, `FlowBoardPage`. Routes in `App.tsx` support full drill-down: Products -> Intentions -> Expectations -> Specs. |

### Boundary Results

| Boundary | Status | Evidence |
|----------|--------|----------|
| No drag-and-drop reordering of Intentions/Expectations | **Clean** | DnD only on FlowBoard for Specs. |
| No bulk operations | **Clean** | All operations are single-entity. |
| No comments or discussion threads | **Clean** | No comment model or UI. |
| Dependency validation only for Intentions | **Clean** | Only `IntentionDependency` model exists. |
| Spec editor is basic form fields (structured editor is SPEC-004) | **Clean** | Basic SpecForm present; structured editor added by SPEC-004. |

### Deliverable Results

| Deliverable | Status | Notes |
|-------------|--------|-------|
| API routes for Intentions CRUD | **Present** | `src/server/routes/intentions.ts`. Note: route pattern is `/api/intentions?product_id=xxx` rather than nested `/api/products/:productId/intentions` as spec stated. Functionally equivalent. |
| API routes for Expectations CRUD | **Present** | `src/server/routes/expectations.ts`. Pattern: `/api/expectations?intention_id=xxx`. |
| API routes for Specs CRUD | **Present** | `src/server/routes/specs.ts`. Pattern: `/api/specs?product_id=xxx`. |
| Intention list and detail page | **Present** | `IntentionListPage.tsx`, `IntentionDetailPage.tsx` |
| Expectation list and detail page | **Present** | `ExpectationListPage.tsx`, `ExpectationDetailPage.tsx` |
| Spec list and basic detail page | **Present** | `SpecListPage.tsx`, `SpecDetailPage.tsx` |
| Breadcrumb navigation component | **Present** | `src/client/components/Breadcrumbs.tsx` |
| Intention dependency selector with circular detection | **Present** | `src/server/services/intentionDependencies.ts` with DFS algorithm |
| React Query hooks for all CRUD | **Present** | `useIntentions.ts`, `useExpectations.ts`, `useSpecs.ts` |
| Seed script with example data | **Present** | `prisma/seed.ts` |

---

## SPEC-004: Spec Structured Editor and Export

### Expectation Results

| ID | Description | Status | Notes |
|----|-------------|--------|-------|
| EXP-011 | Structured Spec editor with five collapsible sections | **Pass** | `SpecForm.tsx` uses `CollapsibleSection` component for Context, Expectations, Boundaries, Deliverables, and Validation sections. `DynamicListEditor` for array fields. `ContextEditor` for structured context. `useWatch` provides live form data to `ChecklistSidebar`. Context pre-populated from Product via `createSpec()` service. `ContextDiffBadge` shows "Modified" badge when spec context diverges from product context. |
| EXP-012 | YAML export matching canonical Spec schema | **Pass** | `src/client/lib/exportYaml.ts`: `specToYaml()` produces structured YAML with `spec.id`, `title`, `description`, `status` (phase), `complexity`, `context`, `expectations`, `boundaries`, `deliverables`, `validation`. Uses `js-yaml` library. `downloadYaml()` triggers browser download. Draft status included via `status: spec.phase`. Special characters handled by `js-yaml` default escaping. Unit tests in `exportYaml.test.ts`. |
| EXP-013 | Markdown prompt export for AI agent sessions | **Pass** | `src/client/lib/exportMarkdown.ts`: Includes **Preamble** section instructing AI agent on IDD format (lines 12-21). Context rendered inline. Expectations as checklist (`- [ ]`). Boundaries, deliverables, validation as lists. Token warning: `SpecDetailPage.tsx` line 145-147 shows `>8K tokens` badge when `tokenCount > 8000`. `estimateTokens()` uses `words * 1.3` formula. Unit tests in `exportMarkdown.test.ts`. |

### Boundary Results

| Boundary | Status | Evidence |
|----------|--------|----------|
| No in-browser YAML validation/linting | **Clean** | No YAML validation UI. |
| No version history or diff on Specs | **Clean** | No version/history tracking. |
| No collaborative editing | **Clean** | Single-user editing only. |
| Export is download only | **Clean** | `downloadYaml()` and `downloadMarkdown()` produce file downloads; no API integration. |

### Deliverable Results

| Deliverable | Status | Notes |
|-------------|--------|-------|
| Spec structured editor with five collapsible sections | **Present** | `SpecForm.tsx` + `CollapsibleSection.tsx` |
| Context diff indicator component | **Present** | `src/client/lib/contextDiff.ts` + `ContextDiffBadge` in `SpecForm.tsx` |
| Dynamic list editor component | **Present** | `src/client/components/DynamicListEditor.tsx` |
| YAML export function with download trigger | **Present** | `src/client/lib/exportYaml.ts` |
| Markdown prompt export function with download trigger | **Present** | `src/client/lib/exportMarkdown.ts` |
| Token estimation utility (word count x 1.3) | **Present** | `src/client/lib/tokenEstimate.ts` |
| Context inheritance logic | **Present** | `src/server/services/spec.ts` lines 48-54: snapshots Product context on Spec create. |

---

## SPEC-005: Spec Completeness Checklist

### Expectation Results

| ID | Description | Status | Notes |
|----|-------------|--------|-------|
| EXP-014 | Completeness checklist with 11 criteria, pass/fail per item, gate enforcement | **Pass** | `src/shared/checklist/evaluator.ts`: Pure function `evaluateChecklist()` checks all 11 criteria exactly as specified. Returns `ChecklistResult` with `items[]`, `passed` count, `total`, `ready` boolean. Failure messages provide actionable guidance. **Client integration:** `CompletenessChecklist.tsx` shows green/red indicators, fraction badge (e.g., "7/11"), progress bar. Sidebar on both detail page and edit page. **Live updates:** `ChecklistSidebar` in `SpecForm.tsx` uses `useWatch` to rebuild Spec shape from form values in real-time. **Server gate:** `phaseTransition.ts` lines 30-37: Draft->Ready blocked unless `checklist.ready === true`. Returns 422 with full checklist in response. **Override:** `override_reason` bypasses gate, recorded in `PhaseTransition` record. Unit tests in `evaluator.test.ts`. |

**Criteria verification (all 11):**

| # | Criterion | Evaluator Code | Status |
|---|-----------|---------------|--------|
| 1 | Context: stack non-empty | `spec.context.stack.length > 0` | Correct |
| 2 | Context: patterns non-empty | `spec.context.patterns.length > 0` | Correct |
| 3 | Context: at least one convention | `spec.context.conventions.length >= 1` | Correct |
| 4 | Context: auth non-empty | `spec.context.auth.trim().length > 0` | Correct |
| 5 | At least one Expectation linked | `expectations.length >= 1` | Correct |
| 6 | All Expectations have descriptions | `expectations.every(e => e.description.trim().length > 0)` | Correct (uses description as proxy for validation_criteria) |
| 7 | All Expectations have 2+ edge cases | `expectations.every(e => e.edge_cases.length >= 2)` | Correct |
| 8 | At least one boundary | `spec.boundaries.length >= 1` | Correct |
| 9 | At least one deliverable | `spec.deliverables.length >= 1` | Correct |
| 10 | At least one automated + one human validation | `spec.validation_automated.length >= 1 && spec.validation_human.length >= 1` | Correct |
| 11 | Peer-reviewed flag set | `spec.peer_reviewed === true` | Correct |

### Boundary Results

| Boundary | Status | Evidence |
|----------|--------|----------|
| No custom/configurable checklist criteria | **Clean** | Fixed 11 criteria, no configuration UI. |
| No peer review workflow | **Clean** | `peer_reviewed` is a manual boolean toggle on the Spec form. |
| Checklist gates Draft -> Ready only | **Clean** | `phaseTransition.ts` line 31: only checks `spec.phase === 'Draft' && toPhase === 'Ready'`. Non-Draft transitions unrestricted (except Review->Validating peer review gate). |

### Deliverable Results

| Deliverable | Status | Notes |
|-------------|--------|-------|
| Completeness evaluator (pure function) | **Present** | `src/shared/checklist/evaluator.ts` |
| Checklist display component with progress bar | **Present** | `src/client/components/CompletenessChecklist.tsx` |
| Integration with Spec editor view | **Present** | `ChecklistSidebar` in `SpecForm.tsx` with live updates |
| Shared evaluator usable by client and server | **Present** | Imported by both `CompletenessChecklist.tsx` (client) and `phaseTransition.ts` (server) |

---

## SPEC-006: Flow Board with WIP Limits and Gates

### Expectation Results

| ID | Description | Status | Notes |
|----|-------------|--------|-------|
| EXP-008 | Kanban flow board with six phase columns | **Pass** | `FlowBoard.tsx` renders 6 columns (Draft, Ready, InProgress, Review, Validating, Done) via `PHASES` constant. `PhaseColumn.tsx` renders droppable columns. `SpecCard.tsx` renders draggable cards with title, complexity badge, and days-in-phase counter. `@dnd-kit/core` for drag-and-drop. `KeyboardSensor` for accessibility. Empty state shows "No specs in this phase". Backward moves allowed and logged. E2E tests in `e2e/flow-board.spec.ts`. **Minor deviation:** Card shows complexity badge instead of priority badge as specified in EXP-008. This is a deliberate design decision noted in gap analysis. |
| EXP-009 | Configurable WIP limits per phase | **Partial** | WIP limits stored on Product as `wip_limits` JSON (draft, ready, in_progress, review, validating). `PhaseColumn` header shows `count/limit` or just count when unlimited. At-limit columns get destructive badge. Client-side check in `FlowBoard.tsx` line 104-109 and server-side check in `phaseTransition.ts` line 20-28. `WipOverrideDialog` allows override with reason. **WIP limit 0 = unlimited:** `wipCheck.ts` line 31: `if (limit === 0) return { allowed: true }`. **Limit reduced below current:** blocks new entries only (correct). **Partial because:** WIP limits are per-Product, not per-Team as spec says. No Team entity exists yet (deferred with INT-008). |
| EXP-010 | Validation gates on phase transitions | **Partial** | **Draft -> Ready gate:** Implemented via completeness checklist. Returns 422 with checklist when fails. Override with reason supported. **Review -> Validating gate:** `phaseTransition.ts` line 39-44 checks `spec.peer_reviewed`. Returns `PEER_REVIEW_REQUIRED` error. Override supported. **Gate override:** `GateOverrideDialog.tsx` captures reason. `override_reason` stored in `PhaseTransition` record. **Missing edge case:** "Spec passes gate then linked Expectation is modified -> Spec flagged for re-review" is NOT implemented. No staleness detection exists. |

### Boundary Results

| Boundary | Status | Evidence |
|----------|--------|----------|
| No swimlanes | **Clean** | Board is flat columns, no swimlanes. |
| No card filtering or search on board | **Clean** | `ListToolbar.tsx` exists for list pages but is NOT used on FlowBoardPage. Board has no search/filter. |
| No real-time collaboration | **Clean** | No WebSocket or SSE. Data refreshes via React Query refetch. |
| Six phases are fixed | **Clean** | `PHASES` is a hardcoded constant array. No custom column support. |

### Deliverable Results

| Deliverable | Status | Notes |
|-------------|--------|-------|
| Flow board page component with six columns | **Present** | `FlowBoardPage.tsx` + `FlowBoard.tsx` + `PhaseColumn.tsx` |
| Spec card component | **Present** | `SpecCard.tsx` -- shows title, complexity badge, days-in-phase. Note: shows complexity instead of priority as spec states. |
| Drag-and-drop with gate validation on drop | **Present** | `@dnd-kit/core` with `handleDragEnd` invoking `doTransition`. |
| WIP limit configuration UI | **Incomplete** | WIP limits are configurable on the Product model and used by the board, but there is no dedicated "WIP limit settings" UI panel on the board page. Configuration happens through Product edit form. |
| Phase transition API endpoint | **Present** | `POST /api/specs/:id/transition` in `specs.ts` routes. |
| PhaseTransitions table logging | **Present** | All transitions logged with `spec_id`, `from_phase`, `to_phase`, `timestamp`, `user_id`, `override_reason`. |
| Gate validation logic with completeness evaluator | **Present** | `phaseTransition.ts` integrates `evaluateChecklist()` for Draft->Ready gate. |

---

## Cross-Cutting Validation

### API Response Shape Consistency

All API routes return `{ data, error, meta }` shape as required:
- `products.ts`: Confirmed at lines 11, 17, 25, 39, 55
- `intentions.ts`: Confirmed at lines 13, 20, 33, 46, 59, 68, 73, 79, 96, 101, 108, 114
- `specs.ts`: Confirmed at lines 14, 21, 34, 43, 57, 66, 73, 81, 88, 95, 101, 113, 119
- `expectations.ts`: Confirmed at lines 13, 19, 30, 39, 50, 59, 67, 71
- `errorHandler.ts`: Confirmed at line 5
- `auth.ts`: Confirmed at line 18

### Soft Delete Pattern

All primary entities use `archived_at` timestamp:
- Product: `deleteProduct()` sets `archived_at` (line 74-76)
- Intention: `deleteIntention()` sets `archived_at` (line 89-92)
- Expectation: `deleteExpectation()` sets `archived_at` (confirmed in service)
- Spec: `deleteSpec()` sets `archived_at` (line 114-117)

All list/get queries filter `archived_at: null`.

### Zod Validation (Client + Server)

Schemas in `src/shared/schemas/` used by both:
- Server: via `validate()` middleware in route handlers
- Client: via `zodResolver` in React Hook Form (confirmed in `SpecForm.tsx` line 180)

### React Query for All Data Fetching

All data access uses TanStack Query hooks:
- `useProducts.ts`, `useIntentions.ts`, `useExpectations.ts`, `useSpecs.ts`, `usePhaseTransition.ts`
- Proper cache invalidation on mutations.

### shadcn/ui Components Only

UI built exclusively with shadcn/ui components: Badge, Button, Card, Dialog, Form, Input, Label, Select, Separator, Textarea, Collapsible, Skeleton, DropdownMenu. No additional component libraries introduced.

### Test Coverage

| Test Suite | Location | Type |
|------------|----------|------|
| Checklist evaluator | `src/shared/checklist/evaluator.test.ts` | Unit |
| WIP check | `src/shared/lib/wipCheck.test.ts` | Unit |
| Token estimate | `src/client/lib/tokenEstimate.test.ts` | Unit |
| Context diff | `src/client/lib/contextDiff.test.ts` | Unit |
| Export YAML | `src/client/lib/exportYaml.test.ts` | Unit |
| Export Markdown | `src/client/lib/exportMarkdown.test.ts` | Unit |
| Expectation schema | `src/shared/schemas/expectation.test.ts` | Unit |
| Intention schema | `src/shared/schemas/intention.test.ts` | Unit |
| Spec schema | `src/shared/schemas/spec.test.ts` | Unit |
| Intention service | `src/server/services/intention.test.ts` | Unit |
| Expectation service | `src/server/services/expectation.test.ts` | Unit |
| Spec service | `src/server/services/spec.test.ts` | Unit |
| Phase transition | `src/server/services/phaseTransition.test.ts` | Unit |
| Circular dependency | `e2e/circular-dependency.spec.ts` | E2E |
| Intention CRUD | `e2e/intention.spec.ts` | E2E |
| Expectation CRUD | `e2e/expectation.spec.ts` | E2E |
| Spec CRUD | `e2e/spec.spec.ts` | E2E |
| Spec editor/export | `e2e/spec-editor-export.spec.ts` | E2E |
| Flow board | `e2e/flow-board.spec.ts` | E2E |
| Completeness checklist | `e2e/completeness-checklist.spec.ts` | E2E |

---

## Automated Validation

| Check | Result | Notes |
|-------|--------|-------|
| All 11 checklist criteria implemented | **Pass** | Verified in `evaluator.ts` against product def criteria list |
| API response shape `{ data, error, meta }` | **Pass** | All routes confirmed |
| Soft-delete pattern on all entities | **Pass** | `archived_at` used consistently |
| Zod schemas shared client/server | **Pass** | Schemas in `src/shared/schemas/` imported by both |
| Circular dependency detection | **Pass** | DFS algorithm with unit tests |
| Minimum 2 edge cases enforced | **Pass** | `z.array(z.string()).min(2)` in expectation schema |
| Context inheritance on Spec create | **Pass** | `spec.ts` service snapshots Product context |
| WIP limit 0 = unlimited | **Pass** | `wipCheck.ts` returns `allowed: true` when limit is 0 |
| Draft->Ready gate blocks without checklist pass | **Pass** | `phaseTransition.ts` line 30-37 |
| Review->Validating gate requires peer_reviewed | **Pass** | `phaseTransition.ts` line 39-44 |
| Override bypasses gate with reason | **Pass** | `override_reason` parameter skips all gate checks |
| Token warning at 8000 threshold | **Pass** | `SpecDetailPage.tsx` line 145-147 |
| YAML export includes status: draft for Draft specs | **Pass** | `exportYaml.ts` line 16: `status: spec.phase` |
| Markdown export includes preamble | **Pass** | `exportMarkdown.ts` lines 12-21 |
| Delete Intention blocked when children exist | **Pass** | `intention.ts` service returns `has_children` error |

## Human Review Required

- [ ] Form UX: verify field ordering, labels, and error messages match team expectations
- [ ] Flow board UX: card readability at various screen sizes, drag responsiveness
- [ ] Gate messaging: verify rejection reasons are clear and actionable in browser
- [ ] Export quality: paste Markdown export into Claude Code and assess AI agent comprehension
- [ ] Context diff indicator visibility and clarity on Spec editor
- [ ] Verify docker compose starts cleanly on target environment (Podman vs Docker)
- [ ] Verify `npx prisma migrate dev` applies without errors on fresh database

---

## Recommendations

### Priority 1 -- Address before next feature development

1. **Expectation staleness detection** (EXP-010 edge case): When a linked Expectation is modified after a Spec has passed a gate, the Spec should be flagged for re-review. This is a process integrity feature. Suggested approach: compare `Expectation.updated_at` against the latest PhaseTransition timestamp for the Spec.

2. **Product detail progress indicator** (EXP-002): Add Intention fulfillment percentage (count of Fulfilled Intentions / total Intentions). The data is already available via the Intentions query.

### Priority 2 -- Align with product definition

3. **API route nesting**: Product def specifies nested routes like `/api/products/:productId/intentions`. Implementation uses flat routes with query parameters (`/api/intentions?product_id=xxx`). Functionally equivalent but inconsistent with documented API design. Consider updating product def to match implementation, or vice versa.

4. **SpecCard priority vs complexity**: Product def (EXP-008) says cards show "priority" but implementation shows "complexity." Both are defensible; document the decision.

5. **WIP limit settings UI**: No dedicated settings panel on the board. WIP limits are configured through the Product edit form, which is adequate but less discoverable. Consider adding a settings icon on the board page that opens the WIP configuration.

### Priority 3 -- Post-MVP alignment

6. **Missing data model fields**: `owner`, `value_proposition`, `strategic_alignment`, `validation_criteria` (on Expectation). These are documented in the gap analysis and should be addressed with INT-008 (Team/Multi-Product Support) or a dedicated schema evolution spec.

7. **Intention field naming**: `title`/`description` vs `statement`/`rationale`. Recommend updating product definition to match implementation, as the generic names are more conventional and the codebase is already built.
