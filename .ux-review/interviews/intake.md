# UX Review Intake — Forge

**Date:** 2026-03-20
**App URL:** http://localhost:5173
**App Type:** Web application (React SPA + Express API)

## App Purpose
Forge is a spec-management tool for Intent-Driven Development (IDD). It replaces traditional project management (Epics/Features/Stories) with a purpose-decomposition hierarchy: Product → Intentions → Expectations → Specs. Specs are structured, AI-ready documents that flow through a Kanban lifecycle (Draft → Ready → In Progress → Review → Validating → Done).

## Target Users
- Small development team (2-5 people)
- Developers and tech leads managing specs for AI-assisted development
- Users are technically proficient but expect a polished, intuitive UI

## Key Workflows
1. **Product management** — Create/edit products with context (stack, patterns, conventions, auth) and WIP limits
2. **Intention hierarchy** — Define intentions with priorities and dependencies, then break into expectations
3. **Spec authoring** — Create structured specs with context inheritance, boundaries, deliverables, validation criteria
4. **Spec lifecycle** — Move specs through phases via drag-and-drop Flow Board or detail page transitions
5. **Completeness checklist** — 11-criteria gate for Draft→Ready, with override capability
6. **Export** — YAML and Markdown export of specs for AI consumption

## Known Pain Points
- Visual design needs polish — functional but looks generic/unfinished
- No other specific pain points raised; open to findings

## Business Goals
- Enable AI-ready spec authoring for development teams
- Replace ad-hoc project management with structured IDD workflow
- Make specs first-class artifacts that AI agents can consume

## Review Scope
- Full app review (all workflows)
- All entity CRUD flows
- Flow Board with drag-and-drop
- Navigation and information architecture
- Visual design quality

## Tech Stack
- React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui
- Express.js backend, Prisma ORM, SQL Server
- @dnd-kit for drag-and-drop
