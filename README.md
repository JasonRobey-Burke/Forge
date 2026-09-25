# idd-forge

Repo-local web UI for [Intent-Driven Development](https://github.com/JasonRobey-Burke/Forge) (IDD) artifacts. Reads and writes YAML files produced by the IDD Claude Code plugin — no database, no Docker, no auth.

## What It Does

- **Product workspace** — Overview, Roadmap, Product map, Delivery and Evidence keep product context visible; expand an outcome to edit its expectations
- **Draft creation** — Review and create user-authored Draft intentions and expectations, with confirmed edge cases and reciprocal parent links
- **Flow Board** — Kanban view of all Specs across six phases (Draft → Ready → In Progress → Review → Validating → Done) with drag-and-drop and WIP limits
- **Gap-check awareness** — Reads each Spec's `gap_check` annotation (the IDD adversarial pre-execution gate) and shows gate badges on board cards and detail pages; Ready → In Progress is gated on a clean gap-check (passed, or warnings with recorded human acknowledgment), with override + audit trail
- **Pipeline reports** — Gap-check reports, execution reports, and validation reviews from `docs/reviews/` are browsable and linked from each Spec
- **Pipeline metrics** — A per-product Metrics view computed read-only from artifacts already on disk: Gap-Check First-Round Pass Rate, average rounds-to-pass, execution-report gap counts, review-stage First-Pass Rate, cycle time, and review queue depth
- **Artifact hierarchy** — Browse Products, Intentions, Expectations, and Specs with full detail and inline editing
- **Markdown rendering** — Descriptions, problem statement, vision, boundaries, deliverables, and other prose fields render as formatted markdown (bold, lists, headings, code, tables) instead of raw text
- **Completeness checklist** — Gates Draft → Ready transitions with 11 criteria; supports override with audit trail
- **YAML editing** — Edit any artifact's raw YAML directly in the browser
- **Spec export** — Export Specs as AI-ready Markdown prompts or structured YAML
- **Live reload** — Detects external file changes (e.g. from AI agents) and updates the UI in real time

## Quick Start

Run it directly with `npx` from any repo that has (or will have) a `docs/` directory:

```bash
npx @jasonrobey/idd-forge
```

Or install it as a dev dependency and run via the short binary name:

```bash
npm install -D @jasonrobey/idd-forge
npx idd-forge
```

Forge scans `docs/` for IDD artifacts and opens a browser to `http://localhost:4000`. If `docs/` doesn't exist, it will offer to create the directory structure for you.

## CLI Options

```
idd-forge [options]

Options:
  --port <number>   Server port (default: 4000, auto-increments if in use)
  --docs <path>     Path to docs directory (default: ./docs)
  --no-open         Don't open browser automatically
  -h, --help        Show help
  -v, --version     Show version
```

## How It Works

Forge reads from the IDD directory structure:

```
your-repo/
├── docs/
│   ├── products/       PROD-001.yaml
│   ├── intentions/     INT-001.yaml
│   ├── expectations/   EXP-001.yaml
│   ├── specs/          SPEC-001.yaml
│   └── reviews/        SPEC-001-review.md
└── package.json
```

Changes to YAML files are detected in real time — edit files with the IDD Claude Code plugin or any editor, and the UI updates automatically.

## Product Workspace

The product workspace is included starting with version 0.7.0. To run a source checkout, use `npm ci`, `npm run build`, then `npm start`.

Overview separates expectation coverage, spec delivery and reported validation, with links to supporting records. There is no overall percent complete. Done is delivery status, not proof of validation; a reported Validated expectation still has unknown evidence unless a supported source establishes a result. Missing or unsupported reports remain visibly missing or unknown. Parse errors mark the snapshot incomplete.

Roadmap groups intentions into Now, Next, Later and Unscheduled, using optional `forge.roadmap` metadata. Move and reorder controls work by keyboard. Placement never changes intention status or spec phase. Target windows are user-entered labels. Existing artifacts need no migration; reading them writes nothing. Product map retains ancestors when filtering and paginates large child lists. Delivery retains server-enforced phase gates and recorded override reasons.

Create an intention from its product, or an expectation from its intention, then review the exact Draft content before creating it. Expectations require validation criteria, at least two distinct nonempty edge cases and explicit confirmation. Forge adds the parent backlink and does not promote lifecycle status. Product/spec creation, deletion, AI authoring and execution remain outside this workflow.

## Saving and Recovery

Editors preserve drafts through external refreshes and failed saves. When “File changed outside Forge” appears, compare the current source, copy your draft, or reload after confirming discard. There is no force-overwrite action. Session recovery is scoped to the repository, artifact and original revision, and requires explicit restoration. If browser storage is unavailable, the editor explains that recovery is unavailable while retaining the open draft.

While a save is pending, its inputs are protected. Requests have a 30-second client deadline; a timeout does not prove the server write failed. Creation retains its draft and requires current-source/child review before another explicit submission, without automatic replay. Other transport failures or invalid responses can also leave creation uncertain: inspect children and parent links before submitting again. A failed workspace refresh keeps cached content visible with a warning and Retry, including inside an open editor.

Saves check exact source revisions, validate before writing and preserve unrelated YAML structure, comments and fields. Unsupported structured fields remain read-only in ordinary forms, with advanced source access. API writes require `If-Match`: missing preconditions return 428; stale or deleted source returns 409 `REVISION_CONFLICT`. Phase changes still use the transition service.

Single-file writes use a checked temporary-file rename. An external process can still write between the final revision check and rename; this is not cross-process transaction isolation. Creation and reparenting use recoverable multi-file writes, so external readers can observe intermediate files. If `RECOVERY_REQUIRED` appears, preserve the affected files and `docs/.forge-transactions/` journals, and inspect the reported paths before retrying. Startup attempts hash-checked recovery without overwriting intervening external edits; unresolved affected paths remain blocked. Do not delete recovery journals to bypass the block.

For a future local upgrade, stop Forge and other artifact writers, and back up the configured docs root, including hidden journals and permissions. Reverting application code does not undo artifact changes; older writers may strip new metadata. See the [local upgrade and recovery runbook](docs/guildhall/plans/2026-09-24-product-workspace.md#garran-final-runbook-verbatim) before upgrading or rolling back.

## Development Verification

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
# Workspace-only selection, including its build step:
npm run test:e2e:workspace
```

Both Playwright configurations start a dedicated server on port 4181 against a generated temporary docs root; they do not reuse an existing server. Leave that port available and build before `test:e2e`. Never point fixture helpers at real repository artifacts. Normal harness shutdown removes its temporary root and state marker.

## Requirements

- Node.js 20 or later

## Project Status

- [Current implementation status](docs/implementation-status.md)
- [Product workspace verification and limitations](docs/superpowers/reports/2026-09-24-product-workspace-verification.md)
