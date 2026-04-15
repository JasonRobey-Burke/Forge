# Intake Interview — Forge UX Review (Round 2)

**Date:** 2026-03-21
**App:** Forge (spec-management tool for Intent-Driven Development)
**URL:** http://localhost:5173/
**Type:** Web application (React SPA + Express API)
**Previous review:** 2026-03-20 (full app review)

## Application Overview

Forge replaces traditional project management (Epics/Features/Stories) with a purpose-decomposition hierarchy: Product > Intentions > Expectations > Specs. Specs are the central artifact — structured, AI-ready documents that flow through a Kanban lifecycle (Draft > Ready > In Progress > Review > Validating > Done).

**Tech stack:** React 18+, TypeScript, Vite, Tailwind CSS, shadcn/ui, Express.js, Prisma, Azure SQL, @dnd-kit for drag-and-drop

## Target Users

- **Engineering leads** — managing implementation work and specs
- **Product managers** — defining products, intentions, and expectations
- **Solo developers** — using IDD for their own projects
- **Cross-functional teams** — mixed teams of PMs, devs, and designers collaborating

Technical background ranges from PM-level (comfortable with web tools, less technical) to senior engineers (highly technical, expect keyboard shortcuts and efficiency).

## Key Workflows (Priority Focus)

1. **Spec authoring & editing** — Creating and editing specs with structured sections (Context, Boundaries, Deliverables, Validation)
2. **Kanban phase transitions** — Moving specs through Draft > Ready > In Progress > Review > Validating > Done with gates
3. **Completeness checklist** — Understanding and satisfying the 11-criteria gate for Draft > Ready

## Known Pain Points

1. **Information density** — Too much data on screen, hard to find what matters
2. **Onboarding clarity** — New users don't understand the IDD hierarchy or workflow
3. **Visual design** — Functional but looks generic/unfinished (from previous review)

## Review Scope

**Primary focus:** Kanban & gates — the phase transition workflow and completeness checklist (11-criteria gate for Draft > Ready)

**Secondary focus:** Spec authoring/editing experience, information density, and onboarding clarity as they relate to the Kanban workflow.

## Business Goals

- Make IDD accessible to teams unfamiliar with the methodology
- Reduce friction in spec lifecycle management
- Ensure the completeness checklist is helpful rather than burdensome
- Enable AI-ready spec authoring for development teams

## Success Metrics

- Task completion rate for spec transitions
- Time to understand the IDD hierarchy (onboarding)
- Reduction in user confusion around phase gates
