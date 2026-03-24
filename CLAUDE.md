# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Forge is a **repo-local** spec-management tool for Intent-Driven Development (IDD). It reads and writes YAML files that the IDD Claude Code plugin produces, providing a web UI for visualizing and editing IDD artifacts. No database, no Docker, no auth — just `npx forge` in any repo with a `docs/` directory.

The IDD hierarchy: **Product → Intentions → Expectations → Specs**. Specs are the central artifact — structured, AI-ready documents that flow through a Kanban lifecycle (Draft → Ready → In Progress → Review → Validating → Done).

The full product definition lives in `docs/forge-product-definition-v1.1.md`.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite 8, Tailwind CSS 3, shadcn/ui
- **Backend:** Express.js 5 (TypeScript), Node.js 20 LTS
- **Data store:** YAML files on disk, in-memory index (`src/server/lib/yamlStore.ts`)
- **File watching:** chokidar v4 for live refresh when AI agents edit YAML externally
- **DnD:** @dnd-kit/core (Flow Board drag-and-drop)
- **Toasts:** Sonner (toast notifications)

## Development Commands

```bash
# Start dev environment (Express + Vite concurrently)
npm run dev

# TypeScript type-check (server + client)
npm run typecheck

# Build for production (Vite client build + tsc server build)
npm run build

# Start production server (serves built client + API)
npm start

# Run unit tests
npm test

# Run E2E tests
npm run test:e2e
```

## How It Works

```
User's repo/
├── docs/                    ← YAML source of truth
│   ├── products/            PROD-001.yaml
│   ├── intentions/          INT-001.yaml ... INT-003.yaml
│   ├── expectations/        EXP-001.yaml ... EXP-006.yaml
│   ├── specs/               SPEC-001.yaml ... SPEC-003.yaml
│   └── reviews/             SPEC-001-review.md
└── package.json

$ npx forge                  ← starts local server
  Forge reading artifacts from ./docs/
  Found: 1 product, 3 intentions, 6 expectations, 3 specs
  Forge running at http://localhost:4000
```

**Startup:** Scans `docs/**/*.yaml`, parses each file, builds in-memory Maps per entity type.
**Reads:** Sub-millisecond lookups from in-memory maps.
**Writes:** Update in-memory map → `yaml.dump()` → write file to disk.
**External changes:** chokidar detects file changes → re-parses → SSE push → React Query invalidates.

## Architecture

**Monorepo:** Single package serving React SPA + Express API.

```
src/
  server/          # Express API
    routes/        # Route-per-resource (products.ts, intentions.ts, expectations.ts, specs.ts)
    middleware/    # Zod validation, error handling
    services/     # Business logic (thin wrappers around yamlStore)
    lib/           # yamlStore.ts (in-memory YAML index), fileWatcher.ts (chokidar)
  client/          # React SPA
    pages/         # Route-level pages (List, Detail, Edit for each entity + FlowBoardPage)
    components/   # Shared UI components (shadcn/ui based)
      ui/          # shadcn/ui primitives (button, card, dialog, form, etc.)
      skeletons/   # Loading skeletons (CardGridSkeleton, DetailPageSkeleton, FlowBoardSkeleton)
    hooks/         # React Query hooks + useDocumentTitle, useCurrentProduct, useFileWatcher
    lib/           # Utilities (api.ts, phaseColors, exportYaml, exportMarkdown, tokenEstimate, contextDiff)
  shared/          # Shared between client and server
    types/         # TypeScript interfaces for all entities + enums
    schemas/       # Zod validation schemas (used by both form validation and API)
    checklist/     # Pure evaluator function for completeness checklist (11 criteria)
    lib/           # Shared utilities (wipCheck.ts — WIP limit checking)
docs/              # YAML artifacts (source of truth)
  products/        # Product YAML files
  intentions/      # Intention YAML files
  expectations/    # Expectation YAML files
  specs/           # Spec YAML files
bin/
  forge.js         # CLI entry point
e2e/               # Playwright E2E tests + API helpers
```

## YAML Store (`src/server/lib/yamlStore.ts`)

The central data layer. Key concepts:

- **In-memory index:** `Map<id, { data, filePath, raw }>` for each entity type
- **Field mapping:** Translates IDD plugin YAML field names to Forge TypeScript types at parse time:
  - `product.problem` → `problem_statement`
  - `product.value_proposition` → `vision`
  - `product.audience.primary` → `target_audience`
  - `product.technical_context` → `context`
  - `spec.status` → `phase`
  - `spec.validation.automated` → `validation_automated`
  - `spec.phase_history` → embedded phase transition audit trail
- **Write-back:** On edit, reverse-maps Forge types back to IDD YAML format and writes the file
- **Relationship resolution:** `spec.expectations: [EXP-001, EXP-002]` resolved via map lookup
- **Singleton:** `getStore()` / `initStore(docsDir)` pattern

## Key Patterns and Conventions

- **API response shape:** All routes return `{ data, error, meta }`
- **Validation:** Zod schemas in `src/shared/schemas/` are the single source of truth for validation on both client and server
- **Data types:** TypeScript interfaces in `src/shared/types/` define all data models
- **UI components:** Use shadcn/ui exclusively — do not introduce additional component libraries
- **Server state:** React Query (TanStack Query) for all data fetching/mutations
- **Form state:** React Hook Form with Zod resolvers
- **View + Edit only:** Forge does not create or delete artifacts — creation is done by the IDD plugin, deletion by removing YAML files
- **Dates:** Stored as UTC ISO strings in YAML, displayed in user's local timezone

## Flow Board and Phase Transitions

- **Kanban board:** `FlowBoard` component with six phase columns, drag-and-drop via @dnd-kit (including keyboard DnD for accessibility)
- **Phase colors:** Centralized semantic color system in `src/client/lib/phaseColors.tsx` — Draft=slate, Ready=blue, InProgress=amber, Review=purple, Validating=orange, Done=green
- **WIP limits:** Stored per-Product in YAML `wip_limits` field; enforced by `src/shared/lib/wipCheck.ts`
- **Validation gates:**
  - Draft → Ready: completeness checklist must pass (or `override_reason` provided)
  - Review → Validating: `peer_reviewed` flag must be true
  - All other transitions: unrestricted
- **Phase history:** Embedded in each Spec's YAML as `phase_history` array (replaces the old PhaseTransition database table)

## Spec Export

- **YAML export:** `src/client/lib/exportYaml.ts` — structured YAML matching canonical Spec schema
- **Markdown export:** `src/client/lib/exportMarkdown.ts` — AI-ready prompt document with preamble
- **Token estimation:** `src/client/lib/tokenEstimate.ts` — estimates tokens via `words × 1.3`
- **Context diff:** `src/client/lib/contextDiff.ts` — compares Product vs Spec context, returns field-level inherited/modified status

## Testing

- **Unit tests:** Vitest with separate server and client projects (`npm run test:server`, `npm run test:client`)
- **E2E tests:** Playwright (`npm run test:e2e`, `npm run test:e2e:ui`)
- **Test commands:** `npm test` runs all unit tests; `npm run test:watch` for watch mode

## Domain Model

The IDD hierarchy (each level parents the next):
1. **Product** — top-level container with problem statement, vision, audience, and a Context block (stack, patterns, conventions, auth) that inherits down to Specs
2. **Intention** — a purpose statement ("Teams can...") with priority, rationale, and dependencies on sibling Intentions
3. **Expectation** — a testable outcome with validation criteria and edge cases (minimum 2 required); children of an Intention
4. **Spec** — a structured, AI-ready work artifact with Context, Expectations, Boundaries, Deliverables, and Validation sections; links to one or more Expectations via ID references in YAML

Specs flow through phases: **Draft → Ready → In Progress → Review → Validating → Done**, with WIP limits and validation gates.

## Completeness Checklist

The completeness checklist evaluates 11 fixed criteria and gates Draft → Ready transitions:

1. Context: stack non-empty
2. Context: patterns non-empty
3. Context: at least one convention
4. Context: auth non-empty
5. At least one Expectation linked
6. All linked Expectations have descriptions
7. All linked Expectations have 2+ edge cases
8. At least one boundary
9. At least one deliverable
10. At least one automated AND one human validation
11. Spec has been peer-reviewed

**Architecture:**
- Pure evaluator in `src/shared/checklist/evaluator.ts` — imported by both client and server
- Server gate: `POST /api/specs/:id/transition` returns 422 with checklist when Draft→Ready fails
- Override: `override_reason` string bypasses gate, recorded in `phase_history` YAML for audit
- Client: `CompletenessChecklist` component on detail/edit pages; live updates via `useWatch` on edit
