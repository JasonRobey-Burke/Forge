# Gap Analysis: Product Definition vs Implementation

> **Generated:** 2026-03-23
> **Source Document:** `docs/forge-product-definition-v1.1.md` (v1.1)
> **Compared Against:** Current codebase on `main` branch
> **Purpose:** Track discrepancies between the aspirational product definition and the current implementation for future development sessions.

---

## How to Use This Document

The product definition is the **target** — it describes what Forge should become. This gap analysis identifies where the current implementation diverges from that target. Items are categorized by type and priority to guide future work.

---

## 1. Schema/Field Gaps

These are fields described in the product definition that do not exist in the current Prisma schema or application code.

### 1.1 Missing `owner` Field (All Entities)

| Entity | Product Def Reference | Current Schema |
|---|---|---|
| Product | `owner: "Jason Robey"` (PROD-001 YAML) | No `owner` field |
| Intention | EXP-004: "owner" listed as required field | No `owner` field |
| Expectation | EXP-005: "owner" listed as required field | No `owner` field |
| Spec | Implied in various Expectations | No `owner` field |

**Impact:** Cannot track who owns/authored each artifact. Needed for INT-008 (Team and Multi-Product Support) and role-based views.

**Recommended approach:** Add `owner_id` (nullable String) to all four models, populated from auth context. Defer until auth is fully integrated (no BYPASS_AUTH).

---

### 1.2 Intention Field Naming Mismatch

| Product Def | Current Schema | Notes |
|---|---|---|
| `statement` | `title` | The "purpose statement" field |
| `rationale` | `description` | The "why" field |

**Impact:** Low — the implementation captures the same semantics with different names. The product def uses domain-specific terminology (`statement`, `rationale`), while the schema uses generic names (`title`, `description`).

**Decision needed:** Update the product definition to match implementation, or rename schema fields to match the domain language? Domain-specific names are more expressive but generic names are more conventional.

---

### 1.3 Missing Expectation Fields

| Field | Product Def Reference | Current Schema |
|---|---|---|
| `validation_criteria` | EXP-005, EXP-014 checklist item 6 | Not present — `description` serves this purpose |
| `complexity` | EXP-005: listed as required field | Not on Expectation (exists on Spec instead) |

**Impact on checklist:** Checklist criterion #6 says "All linked Expectations have validation criteria" but the evaluator actually checks `description.trim().length > 0`. Functionally equivalent but semantically different.

**Recommended approach:** The `description` field adequately captures what the Expectation validates. No schema change needed, but the product def's checklist wording could be clarified.

---

### 1.4 Missing Product Fields

| Field | Product Def Reference | Current Schema |
|---|---|---|
| `strategic_alignment` | Section in Product YAML block | Not present |
| `value_proposition` | EXP-001 mentions it | Not a discrete field — captured in `vision` |

**Impact:** Low for MVP. Strategic alignment is organizational metadata, not core to the IDD workflow.

**Recommended approach:** Defer until INT-008 (Team and Multi-Product Support) or a portfolio/leadership view is built.

---

## 2. Unimplemented Intentions

These are full Intentions from the product definition that have no implementation.

### 2.1 INT-006: Process Metrics and Dashboards — NOT IMPLEMENTED

**Expectations affected:**
- EXP-015: Dashboard with six metric cards (Spec Cycle Time, First-Pass Rate, Review Queue Depth, Expectation Coverage, Boundary Violation Rate, Rework Rate)
- EXP-016: Spec Cycle Time calculation with phase breakdown

**Current state:** `PhaseTransition` records are being stored (timestamps, from/to phase), which provides the raw data needed. No dashboard, metric calculations, or visualizations exist.

**Foundation in place:**
- `phase_transitions` table captures all transition events
- `phase_changed_at` on Spec tracks current phase duration
- Data is available to calculate cycle times once the feature is built

---

### 2.2 INT-008: Team and Multi-Product Support — NOT IMPLEMENTED

**Expectations affected:**
- EXP-019: Users belong to Teams; Teams have Products; Team selector
- EXP-020: Cross-Product portfolio view for leadership

**Current state:** No Team model, no user-to-team relationships, no portfolio view. Single-user assumed per MVP boundaries (SPEC-002).

---

## 3. Partially Implemented Expectations

### 3.1 EXP-001: Product Create — Partial

**Gap:** Product def lists `value_proposition`, `strategic_alignment`, and `owner` as required fields. Current form has: name, problem_statement, vision, target_audience, status, context.

**Missing from form:** owner, strategic_alignment, value_proposition (as discrete fields).

---

### 3.2 EXP-002: Product Detail View — RESOLVED

~~**Gap:** Product def says "key metrics", "progress indicator showing Intention fulfillment", and "summary of child Intentions and their statuses." Current detail page shows Intention count and Spec count but no progress indicator or status breakdown.~~

**Resolved:** `IntentionProgress` component added to ProductDetailPage (commit `4360093`). Shows fulfillment percentage bar and per-status breakdown badges. Remaining gap: "key metrics" still not shown (deferred to INT-006 Metrics Dashboard).

---

### 3.3 EXP-008: Flow Board Cards — Minor Gap

**Gap:** Product def says cards show "ID, title, priority, and age indicator." Current `SpecCard` shows: truncated ID, title, **complexity** badge (not priority), and days-in-phase indicator.

**Decision needed:** Should cards show priority (from linked Expectations) or complexity (from Spec)? Current implementation shows complexity, which is arguably more useful for flow management.

---

### 3.4 EXP-009: WIP Limits — Partial

**Gap:** Product def says "Team settings allow setting WIP limit per column." Current implementation stores WIP limits on the Product model, not per-team. No Team entity exists yet.

**Current behavior:** WIP limits are configurable per Product and enforced correctly. The "per-team" aspect is deferred with INT-008.

---

### 3.5 EXP-010: Validation Gates — RESOLVED

~~**Gap:** "Spec passes gate then linked Expectation is modified -> Spec flagged for re-review" — staleness detection not implemented.~~

**Resolved:** Staleness detection implemented (commits `0e2acb5`, `5454ae8`). `checkSpecStaleness()` compares Expectation `updated_at` against Draft→Ready PhaseTransition timestamp. Amber warning banner on SpecDetailPage and warning icons on FlowBoard SpecCards when stale. Both gates (Draft→Ready checklist, Review→Validating peer review) fully implemented.

---

### 3.6 EXP-013: Markdown Export Token Warning — RESOLVED

~~**Gap:** Product def says "Export > 8000 tokens -> warning displayed." Token estimation utility exists (`tokenEstimate.ts` with `words * 1.3` formula) but the warning UI integration in the export flow needs verification.~~

**Resolved:** Spec review confirmed the warning IS implemented. `SpecDetailPage.tsx` line 145-147 shows a `>8K tokens` badge when `tokenCount > 8000`. No action needed.

---

### 3.7 EXP-018: Context Templates — NOT IMPLEMENTED (Draft Status)

**Gap:** Product def describes reusable templates for common Spec patterns (API endpoint spec, UI component spec, etc.). This Expectation is in `Draft` status in the product def, indicating it was already deferred.

### 3.8 EXP-004: Deferred Intention Dependency Warning — RESOLVED

~~**Gap:** Product def edge case says "Dependency on a Deferred Intention -> allowed with visual warning." Dependencies on Deferred Intentions are allowed, but no visual warning is displayed in the UI to alert the user.~~

**Resolved:** Dependency status now included in `getIntention()` response (commit `efd853a`). IntentionDetailPage shows status badge for each dependency plus an amber `AlertTriangle` warning for Deferred dependencies.

---

### 3.9 API Route Nesting Pattern — Deviation

**Gap:** Product def (SPEC-003 deliverables) specifies nested routes:
- `/api/products/:productId/intentions`
- `/api/intentions/:intentionId/expectations`

Current implementation uses flat routes with query parameters:
- `/api/intentions?product_id=xxx`
- `/api/expectations?intention_id=xxx`

**Impact:** Functionally equivalent. No behavior difference. This is a documentation vs implementation inconsistency, not a bug.

**Decision needed:** Update the product def to reflect the flat route pattern, or refactor routes to use nesting? Flat routes are simpler and avoid deep nesting.

---

### 3.10 WIP Limit Settings UI Discoverability — RESOLVED

~~**Gap:** No dedicated settings panel on the Flow Board page. Users must navigate to the Product edit form to change WIP limits.~~

**Resolved:** "WIP Settings" button with Settings icon added to FlowBoard header (commit `9d582d9`). Links to Product edit page where WIP limits are configured.

---

## 3.11 Human Review Items (from Spec Review)

The spec review identified items that require manual verification and cannot be validated automatically:

- [ ] Form UX: verify field ordering, labels, and error messages match team expectations
- [ ] Flow board UX: card readability at various screen sizes, drag responsiveness
- [ ] Gate messaging: verify rejection reasons are clear and actionable in browser
- [ ] Export quality: paste Markdown export into Claude Code and assess AI agent comprehension
- [ ] Context diff indicator visibility and clarity on Spec editor
- [ ] Verify docker compose starts cleanly on target environment (Podman vs Docker)
- [ ] Verify `npx prisma migrate dev` applies without errors on fresh database

---

## 4. Implemented but Undocumented Features

These features exist in the codebase but are not described in the product definition. They should be considered for inclusion in a future product definition revision.

| Feature | Location | Description |
|---|---|---|
| **Phase colors system** | `src/client/lib/phaseColors.tsx` | Semantic color mapping for all phases (Draft=slate, Ready=blue, InProgress=amber, Review=purple, Validating=orange, Done=green) and product statuses |
| **Product navigation tabs** | `src/client/components/ProductNav.tsx` | Tab-based navigation: Overview, Intentions, Specs, Board |
| **Keyboard drag-and-drop** | `FlowBoard.tsx` (KeyboardSensor) | Accessibility: keyboard support for moving Spec cards between phases |
| **Toast notifications** | Sonner library, used in FlowBoard and elsewhere | User feedback for phase transitions, errors, and confirmations |
| **Search/filter toolbar** | `src/client/components/ListToolbar.tsx` | Filtering and search on list pages (not on board, per SPEC-006 boundary) |
| **Gate override dialog** | `src/client/components/GateOverrideDialog.tsx` | Modal for capturing override reason when bypassing completeness gate |
| **WIP override dialog** | `src/client/components/WipOverrideDialog.tsx` | Modal for confirming WIP limit override with reason capture |
| **Skeleton loading states** | `src/client/components/skeletons/` | CardGridSkeleton, DetailPageSkeleton, FlowBoardSkeleton |
| **Context diff tracking** | `src/client/lib/contextDiff.ts` | Compares Product context vs Spec context, returns field-level inherited/modified status |
| **Token estimation** | `src/client/lib/tokenEstimate.ts` | Estimates token count for export using `words * 1.3` formula |
| **Layout with branding** | `src/client/components/Layout.tsx` | Main layout with header, gradient accent bar, logo mark |
| **Breadcrumbs** | `src/client/components/Breadcrumbs.tsx` | Full ancestry navigation trail |
| **Collapsible sections** | `src/client/components/CollapsibleSection.tsx` | Reusable collapsible section pattern for Spec editor |
| **Dynamic list editor** | `src/client/components/DynamicListEditor.tsx` | Reusable list editor for boundaries, deliverables, edge cases |
| **Document title hook** | `src/client/hooks/useDocumentTitle.ts` | Sets browser tab title based on current page |

---

## 5. Summary by Priority

### High Priority (Core IDD workflow gaps)
- [ ] **Owner fields** — needed for accountability and future team support

### Medium Priority (Planned features not yet built)
- [ ] **INT-006: Metrics dashboard** — raw data exists, needs UI and calculations

### Low Priority (Deferred by design)
- [ ] **INT-008: Team and Multi-Product Support** — EXP-019, EXP-020
- [ ] **EXP-018: Context Templates** — already Draft in product def
- [ ] **Strategic alignment field** — organizational metadata
- [ ] **Field naming alignment** — statement/rationale vs title/description (cosmetic)

### Resolved
- [x] ~~**Token warning in export UI**~~ — confirmed working at `SpecDetailPage.tsx:145-147`
- [x] ~~**Expectation staleness detection**~~ — implemented in commits `0e2acb5`, `5454ae8` (2026-03-23)
- [x] ~~**EXP-002: Product detail progress indicator**~~ — implemented in commit `4360093` (2026-03-23)
- [x] ~~**EXP-004: Deferred Intention visual warning**~~ — implemented in commit `efd853a` (2026-03-23)
- [x] ~~**WIP limit settings discoverability**~~ — implemented in commit `9d582d9` (2026-03-23)

### Decisions Needed
- [ ] Should Intention fields be renamed to `statement`/`rationale` to match domain language, or should the product def be updated to use `title`/`description`?
- [ ] Should SpecCard show priority or complexity? (Currently shows complexity)
- [ ] Should `validation_criteria` be a separate field on Expectation, or is `description` sufficient?
- [ ] Should API routes use nested paths (`/api/products/:id/intentions`) or flat with query params (`/api/intentions?product_id=xxx`)? Update product def or refactor?
