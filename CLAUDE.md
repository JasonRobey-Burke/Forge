# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Forge is a spec-management tool for Intent-Driven Development (IDD). It replaces traditional project management (Epics/Features/Stories) with a purpose-decomposition hierarchy: **Product → Intentions → Expectations → Specs**. Specs are the central artifact — structured, AI-ready documents that flow through a Kanban lifecycle (Draft → Ready → In Progress → Review → Validating → Done).

The full product definition lives in `docs/forge-product-definition-v1.1.md`.

## Tech Stack

- **Frontend:** React 18+, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend:** Express.js (TypeScript), Node.js 20 LTS
- **Database:** Azure SQL (production), SQL Server 2022 container (development)
- **ORM:** Prisma with `sqlserver` provider
- **Auth:** Microsoft Entra ID (MSAL.js frontend, JWT validation backend); dev bypass via `BYPASS_AUTH=true`
- **Deployment:** Docker, Azure Container Apps, GitHub Actions

## Development Commands

```bash
# Start dev environment (app + SQL Server containers)
podman-compose up

# Stop dev environment
podman-compose down

# Run Prisma migrations against local SQL container
npx prisma migrate dev

# Generate Prisma client after schema changes
npx prisma generate

# Start Vite dev server (proxies /api/* to Express) — without containers
npm run dev

# TypeScript type-check
npm run typecheck

# Build for production
npm run build
```

## Prisma v7 Notes

This project uses Prisma v7 with the driver adapter pattern:
- **Connection URL** lives in `prisma.config.ts` (not in `schema.prisma`)
- **PrismaClient** requires `PrismaMssql` adapter: `new PrismaClient({ adapter })`
- **SQL Server enums** are not supported — use `String @db.NVarChar(50)` with Zod validation
- See `prisma.config.ts` and `src/server/index.ts` for the pattern

## Architecture

**Monorepo:** Single repo, single container serving React SPA + Express API.

```
src/
  server/          # Express API
    routes/        # Route-per-resource (e.g., products.ts, intentions.ts, specs.ts)
    middleware/    # Auth (Entra JWT + dev bypass), Zod validation, error handling
    services/     # Business logic layer (spec.ts, phaseTransition.ts, etc.)
  client/          # React SPA
    pages/         # Route-level page components
    components/   # Shared UI components (shadcn/ui based)
    hooks/         # React Query (TanStack Query) hooks for server state
    lib/           # Utilities (MSAL config, API fetch wrapper, export functions)
  shared/          # Shared between client and server
    types/         # TypeScript interfaces for all entities
    schemas/       # Zod validation schemas (used by both form validation and API)
    checklist/     # Pure evaluator function for completeness checklist (11 criteria)
prisma/
  schema.prisma    # Data model (sqlserver provider)
  migrations/      # Version-controlled migrations
  seed.ts          # Dev seed data
e2e/               # Playwright E2E tests + API helpers
```

## Key Patterns and Conventions

- **API response shape:** All routes return `{ data, error, meta }`
- **Validation:** Zod schemas in `src/shared/schemas/` are the single source of truth for validation on both client and server
- **Data types:** TypeScript interfaces in `src/shared/types/` define all data models
- **UI components:** Use shadcn/ui exclusively — do not introduce additional component libraries
- **Server state:** React Query (TanStack Query) for all data fetching/mutations
- **Form state:** React Hook Form with Zod resolvers
- **Database access:** Prisma Client only — no raw SQL in application code
- **JSON columns:** Context, Boundaries, Deliverables, and Validation blocks stored as `String` with JSON serialization (SQL Server Prisma limitation)
- **Soft deletes:** All primary entities use `archived_at` timestamp pattern
- **Dates:** Stored as UTC, displayed in user's local timezone
- **Environment config:** Via `.env` files; no hardcoded secrets

## Domain Model

The IDD hierarchy (each level parents the next):
1. **Product** — top-level container with problem statement, vision, audience, and a Context block (stack, patterns, conventions, auth) that inherits down to Specs
2. **Intention** — a purpose statement ("Teams can...") with priority, rationale, and dependencies on sibling Intentions
3. **Expectation** — a testable outcome with validation criteria and edge cases (minimum 2 required); children of an Intention
4. **Spec** — a structured, AI-ready work artifact with Context, Expectations, Boundaries, Deliverables, and Validation sections; links to one or more Expectations via join table

Specs flow through phases: **Draft → Ready → In Progress → Review → Validating → Done**, with WIP limits and validation gates (e.g., completeness checklist required before Ready).

## Implementation Notes

- SPEC-001 covers project scaffolding, Docker setup, and Prisma schema — it produces no UI beyond a placeholder
- SPEC-002 establishes CRUD patterns (Product) that all subsequent entity CRUDs follow
- SPEC-003 builds the full hierarchy (Intentions, Expectations, Specs CRUD)
- SPEC-005 implements the completeness checklist evaluator and Draft→Ready gate
- Circular Intention dependencies must be detected and rejected
- Context inheritance: new Specs snapshot the Product's Context; existing Specs keep their version

## Completeness Checklist (SPEC-005)

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
- Override: `override_reason` string bypasses gate, recorded in `PhaseTransition` for audit
- Client: `CompletenessChecklist` component on detail/edit pages; live updates via `useWatch` on edit
- Non-Draft transitions are unrestricted (no gate)
