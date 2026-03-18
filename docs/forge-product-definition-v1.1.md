# Forge — Product Definition

> **Document Type:** IDD Artifact Set (Product → Intentions → Expectations → Specs)
> **Version:** 1.1
> **Date:** March 2026
> **Author:** Jason Robey, SVP Technology & Process Innovation
> **Status:** Ready for Development

---

## PRODUCT

```yaml
product:
  id: "PROD-001"
  name: "Forge"
  tagline: "Where intent becomes software."
  status: "Active"
  owner: "Jason Robey"
```

### Problem Statement

Teams adopting AI-assisted development need a way to manage the lifecycle of software delivery that reflects how work actually flows in an AI-augmented environment. Traditional project management tools (Azure DevOps, Jira) are built around a work-decomposition model — Epics, Features, User Stories, Tasks — optimized for human sprint capacity. This model breaks down when AI agents compress the build phase by 5-10x, shifting the bottleneck from coding to specification quality, review throughput, and validation.

No existing tool supports the Intent-Driven Development (IDD) process, which organizes work around purpose-decomposition: what a product needs to *be*, not what developers need to *do*. Teams attempting IDD today must use spreadsheets, Markdown files in repos, and manual boards — creating friction, poor visibility, and no metrics.

### Target Audience

- **Primary:** Development teams (3-12 people) practicing AI-assisted development using tools like Claude Code, GitHub Copilot, Kiro, or similar AI coding agents.
- **Secondary:** Product owners, tech leads, and spec authors who define products, author intentions, and write AI-ready specs.
- **Tertiary:** Engineering leadership needing visibility into delivery throughput, spec quality, and process health.

### Value Proposition

Forge is the first tool purpose-built for Intent-Driven Development. It provides:

1. **A native artifact hierarchy** — Product → Intentions → Expectations → Specs — that replaces Epics/Features/Stories with purpose-oriented planning.
2. **A flow-based workflow engine** with WIP limits, validation gates, and continuous prioritization instead of time-boxed sprints.
3. **AI-ready spec export** — Specs rendered in structured YAML/Markdown that AI coding agents can consume directly, eliminating the translation gap between planning tools and execution.
4. **Process metrics** — Spec Cycle Time, First-Pass Rate, Boundary Violation Rate, Review Queue Depth — that measure what matters in AI-assisted delivery.
5. **Spec completeness enforcement** — a checklist-driven gate that prevents underspecified work from reaching AI agents, reducing rework.

### Strategic Alignment (Burke FY26)

- **AI adoption:** Directly enables structured AI-assisted development workflows.
- **Cycle time reduction:** Flow model with metrics to identify and eliminate bottlenecks.
- **Scalable tech-enabled solutions:** Reusable across any team or product using IDD.
- **Process innovation:** Embodies the shift from ceremony-driven to spec-driven delivery.

### Design Principles

1. **Spec-centric, not task-centric.** Every view, workflow, and metric revolves around the quality and flow of Specs, not the activity of individuals.
2. **Opinionated but not rigid.** The tool enforces the IDD hierarchy and flow model but allows teams to configure WIP limits, validation gates, and context templates.
3. **AI-native.** Specs are first-class exportable artifacts. The tool should make it trivial to hand a Spec to an AI agent and get structured output back.
4. **Progressive disclosure.** Leadership sees Products and Intentions. Spec Authors see Expectations and Specs. Developers see Specs and validation results. Nobody sees everything at once unless they want to.
5. **Minimal viable ceremony.** The tool replaces meetings with visibility. If the board answers the question, you don't need the standup.

### Product-Level Context (Inherited by All Specs)

```yaml
context:
  stack:
    frontend: "React 18+, TypeScript, Vite, Tailwind CSS, shadcn/ui"
    backend: "Express.js (TypeScript), Node.js 20 LTS"
    database: "Azure SQL (production), SQL Server 2022 container (development)"
    orm: "Prisma with sqlserver provider"
    auth: "Microsoft Entra ID (MSAL.js frontend, passport-azure-ad / manual JWT validation backend)"
    containerization: "Docker, Docker Compose (dev), single multi-stage Dockerfile (production)"
    hosting: "Azure Container Apps (production)"
    ci_cd: "GitHub Actions → Azure Container Registry → Azure Container Apps"

  patterns:
    - "Monorepo: single repo, single container serving React SPA + Express API"
    - "Component-per-feature folder structure on frontend"
    - "Route-per-resource pattern on backend (e.g., /api/products, /api/intentions)"
    - "React Query (TanStack Query) for server state management"
    - "Zod for runtime validation (shared between client and server)"
    - "React Hook Form for form state"
    - "Prisma Client for all database operations — no raw SQL in application code"
    - "Express middleware chain for auth, error handling, and request validation"

  conventions:
    - "All data models defined as TypeScript interfaces in /src/shared/types/"
    - "Zod schemas in /src/shared/schemas/ — used for both form validation and API request validation"
    - "All API routes return consistent shape: { data, error, meta }"
    - "Use shadcn/ui components for all UI elements; do not introduce additional component libraries"
    - "Responsive layout: desktop-first, usable on tablet"
    - "Environment config via .env files; no hardcoded connection strings or secrets"
    - "Prisma migrations checked into source control; applied via CI/CD pipeline"
    - "All dates stored as UTC; displayed in user's local timezone"
    - "Soft-delete pattern (archived_at timestamp) for all primary entities"

  auth:
    provider: "Microsoft Entra ID"
    frontend: "MSAL.js (@azure/msal-browser) with redirect flow"
    backend: "JWT validation using Entra ID JWKS endpoint; extract user identity and group claims from access token"
    app_registration: "Single App Registration in Entra; API exposed as a scope; SPA configured as a client"
    authorization: "Group-based access control using Entra ID security groups mapped to Forge roles (Admin, Spec Author, Viewer)"
    notes:
      - "No Supabase Auth, no local user/password storage"
      - "All API routes require valid Entra access token except health check"
      - "Group claims included in token via App Registration manifest (groupMembershipClaims: SecurityGroup)"

  infrastructure:
    development:
      - "docker-compose.yml: app container (Node.js with hot reload) + SQL Server 2022 container"
      - "SQL Server container uses mcr.microsoft.com/mssql/server:2022-latest"
      - "Prisma migrations applied via npx prisma migrate dev against local SQL container"
      - "Vite dev server proxies /api/* to Express backend"
      - "Auth bypassed in dev via mock middleware (configurable via BYPASS_AUTH=true env var)"
    production:
      - "Multi-stage Dockerfile: Stage 1 builds React SPA + compiles TypeScript; Stage 2 runs Express serving static build + API"
      - "Azure Container Apps with managed environment"
      - "Azure Container Registry for image storage"
      - "Azure SQL Database (existing license, serverless or provisioned tier)"
      - "Entra App Registration for auth"
      - "Container Apps ingress configured for HTTPS with Entra authentication"
      - "Environment variables and secrets managed via Container Apps secrets / Azure Key Vault"
```

---

## PROJECT STRUCTURE

```
forge/
├── docker-compose.yml              # Dev: app + SQL Server 2022
├── docker-compose.override.yml     # Dev-specific overrides (ports, volumes, hot reload)
├── Dockerfile                      # Multi-stage production build
├── .env.example                    # Template for local env vars
├── .github/
│   └── workflows/
│       └── deploy.yml              # GitHub Actions → ACR → Container Apps
├── prisma/
│   ├── schema.prisma               # Prisma schema (sqlserver provider)
│   ├── migrations/                 # Version-controlled migrations
│   └── seed.ts                     # Dev seed data
├── src/
│   ├── server/                     # Express API
│   │   ├── index.ts                # Express app entry point
│   │   ├── routes/                 # API route handlers
│   │   │   ├── products.ts
│   │   │   ├── intentions.ts
│   │   │   ├── expectations.ts
│   │   │   └── specs.ts
│   │   ├── middleware/             # Auth, validation, error handling
│   │   │   ├── auth.ts             # Entra JWT validation (+ dev bypass)
│   │   │   ├── validate.ts         # Zod request validation
│   │   │   └── errorHandler.ts
│   │   └── services/               # Business logic layer
│   │       ├── productService.ts
│   │       ├── specService.ts
│   │       └── completenessService.ts
│   ├── client/                     # React SPA
│   │   ├── main.tsx                # React entry + MSAL provider
│   │   ├── App.tsx                 # Router setup
│   │   ├── pages/                  # Route-level page components
│   │   │   ├── ProductList.tsx
│   │   │   ├── ProductDetail.tsx
│   │   │   ├── IntentionDetail.tsx
│   │   │   ├── ExpectationDetail.tsx
│   │   │   ├── SpecEditor.tsx
│   │   │   ├── FlowBoard.tsx
│   │   │   └── Dashboard.tsx
│   │   ├── components/             # Shared UI components
│   │   │   ├── Breadcrumbs.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── CompletenessChecklist.tsx
│   │   │   ├── SpecCard.tsx
│   │   │   └── DynamicListEditor.tsx
│   │   ├── hooks/                  # React Query hooks
│   │   │   ├── useProducts.ts
│   │   │   ├── useIntentions.ts
│   │   │   ├── useExpectations.ts
│   │   │   └── useSpecs.ts
│   │   ├── lib/                    # Utilities
│   │   │   ├── msalConfig.ts       # MSAL configuration
│   │   │   ├── api.ts              # Fetch wrapper with auth token
│   │   │   └── export.ts           # YAML/Markdown export functions
│   │   └── types/                  # Client-only types (if any)
│   └── shared/                     # Shared between client and server
│       ├── types/                  # TypeScript interfaces
│       │   ├── product.ts
│       │   ├── intention.ts
│       │   ├── expectation.ts
│       │   ├── spec.ts
│       │   └── enums.ts
│       └── schemas/                # Zod validation schemas
│           ├── product.ts
│           ├── intention.ts
│           ├── expectation.ts
│           └── spec.ts
├── vite.config.ts                  # Vite config with /api proxy
├── tsconfig.json                   # Shared TypeScript config
├── tsconfig.server.json            # Server-specific TS config
├── tsconfig.client.json            # Client-specific TS config
├── tailwind.config.ts
└── package.json
```

---

## INTENTIONS

### INT-001: Product Definition and Vision

```yaml
intention:
  id: "INT-001"
  product: "PROD-001"
  statement: "Teams can define and maintain Products with clear problem statements, vision, audience, and strategic alignment."
  rationale: "The Product artifact anchors all downstream work. Without a clear, visible product definition, Intentions and Specs drift from their purpose."
  priority: "Critical"
  dependencies: []
  status: "Defined"
```

### INT-002: Intent Hierarchy Management

```yaml
intention:
  id: "INT-002"
  product: "PROD-001"
  statement: "Teams can create, organize, and track Intentions, Expectations, and Specs in a parent-child hierarchy tied to a Product."
  rationale: "The core value proposition — replacing Epics/Features/Stories with Product/Intentions/Expectations/Specs. Without this, the tool has no reason to exist."
  priority: "Critical"
  dependencies: ["INT-001"]
  status: "Defined"
```

### INT-003: Flow-Based Workflow

```yaml
intention:
  id: "INT-003"
  product: "PROD-001"
  statement: "Specs flow through a configurable lifecycle with WIP limits and validation gates, providing real-time visibility into work status without requiring time-boxed sprints."
  rationale: "The IDD process replaces sprints with continuous flow. The tool must make the flow visible, enforce WIP limits, and surface bottlenecks."
  priority: "Critical"
  dependencies: ["INT-002"]
  status: "Defined"
```

### INT-004: AI-Ready Spec Authoring and Export

```yaml
intention:
  id: "INT-004"
  product: "PROD-001"
  statement: "Spec Authors can compose structured, AI-ready Specs with context inheritance, boundary definitions, and edge cases — and export them in formats AI coding agents can consume directly."
  rationale: "The Spec is the handoff artifact between humans and AI. If it is not structured, complete, and exportable, the entire process bottleneck remains."
  priority: "Critical"
  dependencies: ["INT-002"]
  status: "Defined"
```

### INT-005: Spec Completeness Validation

```yaml
intention:
  id: "INT-005"
  product: "PROD-001"
  statement: "The tool enforces a completeness checklist before a Spec can enter the Ready state, preventing underspecified work from reaching AI agents."
  rationale: "Garbage in, garbage out at 10x speed. The completeness gate is the single most impactful quality control in the IDD process."
  priority: "High"
  dependencies: ["INT-004"]
  status: "Defined"
```

### INT-006: Process Metrics and Dashboards

```yaml
intention:
  id: "INT-006"
  product: "PROD-001"
  statement: "Leadership and teams can view real-time metrics on spec throughput, quality, and process health to identify bottlenecks and drive continuous improvement."
  rationale: "What gets measured gets managed. IDD introduces new metrics (Spec Cycle Time, First-Pass Rate, etc.) that require tooling support to track."
  priority: "High"
  dependencies: ["INT-003"]
  status: "Defined"
```

### INT-007: Context Inheritance and Templates

```yaml
intention:
  id: "INT-007"
  product: "PROD-001"
  statement: "Product-level context (tech stack, patterns, conventions, auth) cascades to child Specs automatically, with per-Spec override capability."
  rationale: "Repeating context in every Spec is error-prone and creates drift. Inheritance eliminates duplication and keeps Specs consistent."
  priority: "High"
  dependencies: ["INT-001", "INT-004"]
  status: "Defined"
```

### INT-008: Team and Multi-Product Support

```yaml
intention:
  id: "INT-008"
  product: "PROD-001"
  statement: "Multiple teams can work across multiple Products within a single instance, with appropriate access boundaries and cross-product visibility."
  rationale: "Real organizations have multiple products and teams. The tool must scale beyond a single product without becoming an enterprise monolith."
  priority: "Medium"
  dependencies: ["INT-001"]
  status: "Defined"
```

---

## EXPECTATIONS

### Expectations for INT-001: Product Definition and Vision

```yaml
- id: "EXP-001"
  intention: "INT-001"
  description: "A Product can be created with all required fields: name, problem statement, target audience, value proposition, strategic alignment, owner, and status."
  validation: "Create form enforces required fields; saved Product displays all fields correctly."
  edge_cases:
    - "Empty required field → inline validation error, form does not submit"
    - "Very long problem statement (2000+ characters) → accepted and displayed without truncation in detail view"
    - "Duplicate product name → allowed (ID is unique, not name)"
  complexity: "Low"
  status: "Ready"

- id: "EXP-002"
  intention: "INT-001"
  description: "A Product has a dedicated detail view that displays the full product definition, a summary of child Intentions and their statuses, and key metrics."
  validation: "Product detail page loads with all fields, Intention count and status breakdown, and a progress indicator showing Intention fulfillment."
  edge_cases:
    - "Product with zero Intentions → shows empty state with prompt to create first Intention"
    - "Product with 50+ Intentions → paginated or virtualized list, no performance degradation"
  complexity: "Medium"
  status: "Ready"

- id: "EXP-003"
  intention: "INT-001"
  description: "Products have a configurable Context block (stack, patterns, conventions, auth) that is inherited by all child Specs."
  validation: "Context editor on Product detail page; changes propagate to new Specs; existing Specs retain their version unless explicitly refreshed."
  edge_cases:
    - "Context field left empty → Spec inherits empty value, Spec completeness check flags it"
    - "Context updated after Specs created → existing Specs keep their snapshot; new Specs get updated context; UI indicates stale context on existing Specs"
  complexity: "Medium"
  status: "Ready"
```

### Expectations for INT-002: Intent Hierarchy Management

```yaml
- id: "EXP-004"
  intention: "INT-002"
  description: "Intentions can be created as children of a Product with all required fields: statement, rationale, priority, dependencies, owner, and status."
  validation: "Intention create form within Product context; required field enforcement; Intention appears in Product detail view after save."
  edge_cases:
    - "Circular dependency (INT-A depends on INT-B depends on INT-A) → rejected with clear error"
    - "Dependency on a Deferred Intention → allowed with visual warning"
    - "Intention deleted while Expectations exist → blocked; must reassign or delete child Expectations first"
  complexity: "Low"
  status: "Ready"

- id: "EXP-005"
  intention: "INT-002"
  description: "Expectations can be created as children of an Intention with all required fields: description, validation criteria, edge cases (minimum 2), complexity, owner, and status."
  validation: "Expectation create form within Intention context; edge case minimum enforced; Expectation appears under parent Intention after save."
  edge_cases:
    - "Fewer than 2 edge cases → form validation error, cannot save"
    - "Expectation with no Spec linked → allowed in Draft status; flagged in reports"
    - "Expectation reassigned to different Intention → parent relationship updates; history preserved"
  complexity: "Low"
  status: "Ready"

- id: "EXP-006"
  intention: "INT-002"
  description: "Specs can be created linked to one or more Expectations, with all required fields from the Spec schema: context, expectations, boundaries, deliverables, and validation blocks."
  validation: "Spec create/edit form with structured sections; Spec links to parent Expectations; Spec visible on flow board after creation."
  edge_cases:
    - "Spec linked to Expectations across different Intentions → allowed; UI shows cross-Intention indicator"
    - "All linked Expectations deleted → Spec flagged as orphaned; cannot enter Ready status"
    - "Spec with empty boundaries block → allowed but completeness check flags it"
  complexity: "Medium"
  status: "Ready"

- id: "EXP-007"
  intention: "INT-002"
  description: "The full hierarchy is navigable: from Product → drill into Intentions → drill into Expectations → drill into Specs, and back up via breadcrumbs."
  validation: "Clicking any artifact navigates to its detail view; breadcrumb trail shows full ancestry; back navigation works correctly."
  edge_cases:
    - "Deep hierarchy (Product with 20 Intentions, 100 Expectations, 50 Specs) → navigation remains responsive"
    - "Orphaned Spec (parent Expectations removed) → still navigable but visually flagged"
  complexity: "Low"
  status: "Ready"
```

### Expectations for INT-003: Flow-Based Workflow

```yaml
- id: "EXP-008"
  intention: "INT-003"
  description: "A Kanban-style flow board displays Specs in columns representing lifecycle phases: Draft, Ready, In Progress, Review, Validating, Done."
  validation: "Board renders with six columns; Specs appear as cards with ID, title, priority, and age indicator; drag-and-drop moves Specs between phases."
  edge_cases:
    - "Board with zero Specs → shows empty state with guidance on creating first Spec"
    - "Board with 100+ Specs → columns scroll vertically; performance remains acceptable"
    - "Spec moved backward (Review → In Progress) → allowed; logged as a return event for metrics"
  complexity: "Medium"
  status: "Ready"

- id: "EXP-009"
  intention: "INT-003"
  description: "WIP limits are configurable per phase and enforced visually and functionally."
  validation: "Team settings allow setting WIP limit per column; column header shows current/limit count; exceeding limit highlights column in warning state; moving a Spec into an at-limit column requires confirmation."
  edge_cases:
    - "WIP limit set to 0 → treated as unlimited (no limit)"
    - "WIP limit reduced below current count → existing Specs stay; no new Specs allowed until count drops"
    - "WIP limits per team, not global → each team configures independently"
  complexity: "Medium"
  status: "Ready"

- id: "EXP-010"
  intention: "INT-003"
  description: "Validation gates prevent Specs from advancing to certain phases without meeting criteria."
  validation: "Spec cannot move from Draft → Ready without passing completeness checklist. Spec cannot move from Review → Validating without at least one approved review. Gate violations show clear messaging about what is missing."
  edge_cases:
    - "Gate override by team lead → allowed with reason captured; flagged in metrics as override"
    - "Spec passes gate then linked Expectation is modified → Spec stays in current phase but flagged for re-review"
  complexity: "High"
  status: "Ready"
```

### Expectations for INT-004: AI-Ready Spec Authoring and Export

```yaml
- id: "EXP-011"
  intention: "INT-004"
  description: "The Spec editor provides structured sections for Context, Expectations, Boundaries, Deliverables, and Validation — not a freeform text field."
  validation: "Spec edit view renders distinct collapsible sections for each block; each section has appropriate field types (text, lists, key-value pairs); sections are ordered consistently."
  edge_cases:
    - "Context block pre-populated from Product context → editable with diff indicator showing overrides"
    - "Very large Spec (20+ Expectations, 30+ edge cases) → editor remains performant with section collapse"
  complexity: "Medium"
  status: "Ready"

- id: "EXP-012"
  intention: "INT-004"
  description: "A Spec can be exported as a structured YAML file, ready for AI coding agent consumption."
  validation: "Export button produces a file matching the canonical Spec schema from the IDD framework document; file is valid YAML; all fields present."
  edge_cases:
    - "Spec with inherited context → export includes resolved (merged) context, not a reference"
    - "Spec with special characters in text fields → properly escaped in YAML output"
    - "Export of Spec in Draft status → allowed but includes status: draft header"
  complexity: "Medium"
  status: "Ready"

- id: "EXP-013"
  intention: "INT-004"
  description: "A Spec can be exported as a complete Markdown prompt document optimized for pasting directly into an AI coding agent session (Claude Code, Copilot, etc.)."
  validation: "Export produces a single Markdown document with clear section headers, all context rendered inline, expectations as a checklist, boundaries as constraints, and deliverables as an output list."
  edge_cases:
    - "Prompt export includes a preamble instructing the AI agent on how to interpret the Spec structure"
    - "Export > 8000 tokens → warning shown suggesting the Spec may need splitting"
  complexity: "Medium"
  status: "Ready"
```

### Expectations for INT-005: Spec Completeness Validation

```yaml
- id: "EXP-014"
  intention: "INT-005"
  description: "A completeness checklist evaluates a Spec against defined criteria and displays pass/fail status for each item."
  validation: "Checklist panel visible on Spec detail view; each criterion shows green (pass) or red (fail); overall status shown as fraction (e.g., 7/8 passed)."
  checklist_criteria:
    - "Context: stack field is non-empty"
    - "Context: patterns field is non-empty"
    - "Context: conventions has at least one entry"
    - "Context: auth field is non-empty"
    - "At least one Expectation linked"
    - "All linked Expectations have validation criteria"
    - "All linked Expectations have at least 2 edge cases"
    - "Boundaries block has at least one entry"
    - "Deliverables block has at least one entry"
    - "Validation block has at least one automated and one human review item"
    - "Spec has been peer-reviewed (review flag set)"
  edge_cases:
    - "Criteria updated after Specs marked Ready → existing Ready Specs not retroactively blocked"
    - "All criteria pass → visual indicator that Spec is Ready-eligible"
    - "Checklist re-evaluates in real-time as user edits Spec fields"
  complexity: "Medium"
  status: "Ready"
```

### Expectations for INT-006: Process Metrics and Dashboards

```yaml
- id: "EXP-015"
  intention: "INT-006"
  description: "A dashboard displays primary IDD metrics: Spec Cycle Time, First-Pass Rate, Review Queue Depth, Expectation Coverage, Boundary Violation Rate, and Rework Rate."
  validation: "Dashboard page with six metric cards; each shows current value, trend direction, and a sparkline or mini-chart for the last 30 days. Filterable by Product and time range."
  edge_cases:
    - "No completed Specs yet → metrics show 'No data' rather than zero"
    - "Single completed Spec → metrics calculate from one data point with no trend"
    - "Filter to Product with no Specs → dashboard shows empty state"
  complexity: "High"
  status: "Ready"

- id: "EXP-016"
  intention: "INT-006"
  description: "Spec Cycle Time is calculated as elapsed time from a Spec entering Ready to reaching Done, broken down by phase."
  validation: "Each Spec records timestamps for every phase transition; cycle time calculated as Done timestamp minus Ready timestamp; phase breakdown shows time spent in each phase."
  edge_cases:
    - "Spec moved backward (Review → In Progress) → time in Review counted up to the return; time in In Progress restarts"
    - "Spec sits in a phase over a weekend → calendar time, not business hours (configurable later)"
    - "Spec moved directly from Draft to Done (gate override) → cycle time calculated but flagged as atypical"
  complexity: "Medium"
  status: "Ready"
```

### Expectations for INT-007: Context Inheritance and Templates

```yaml
- id: "EXP-017"
  intention: "INT-007"
  description: "When a new Spec is created under a Product, the Product's Context block is automatically copied into the Spec's Context section as a starting point."
  validation: "New Spec form pre-fills Context section from Product; Spec Author can modify any field; modifications are tracked as overrides."
  edge_cases:
    - "Product context is empty → Spec context starts empty; completeness check flags it"
    - "Spec Author clears an inherited field → treated as an explicit override to empty; diff shows removal"
  complexity: "Low"
  status: "Ready"

- id: "EXP-018"
  intention: "INT-007"
  description: "Product-level Context can include reusable templates for common Spec patterns (e.g., API endpoint spec, UI component spec, data pipeline spec)."
  validation: "Product settings include a Templates section; each template pre-fills Spec sections with boilerplate; Spec Author selects a template at creation time."
  edge_cases:
    - "No templates defined → template selector hidden; Spec starts with inherited context only"
    - "Template updated after Specs created from it → existing Specs unaffected; only new Specs use updated template"
  complexity: "Medium"
  status: "Draft"
```

### Expectations for INT-008: Team and Multi-Product Support

```yaml
- id: "EXP-019"
  intention: "INT-008"
  description: "Users belong to one or more Teams; each Team has access to one or more Products; the default view shows the user's Team(s) and their Products."
  validation: "User home view shows Team membership and Product cards; switching between Teams updates the Product list; users with multiple Teams see a Team selector."
  edge_cases:
    - "User belongs to zero Teams → onboarding state with prompt to join or create a Team"
    - "Product shared across two Teams → both Teams see it; Specs are not team-scoped (any team member can work on any Spec within a shared Product)"
    - "User removed from Team → loses access to Team's Products; their authored artifacts remain"
  complexity: "Medium"
  status: "Draft"

- id: "EXP-020"
  intention: "INT-008"
  description: "A cross-Product view allows leadership to see all Products, their Intention fulfillment rates, and aggregated metrics."
  validation: "Portfolio view page shows all Products the user has access to as cards; each card shows name, status, Intention count, fulfillment percentage, and key metrics."
  edge_cases:
    - "User with access to 20+ Products → grid layout with sorting/filtering by status, fulfillment rate"
    - "Product with no Specs → shows 0% fulfillment, not an error"
  complexity: "Medium"
  status: "Draft"
```

---

## SPECS (MVP Scope)

### SPEC-001: Project Scaffolding, Docker Setup, and Database Schema

```yaml
spec:
  id: "SPEC-001"
  product: "PROD-001"
  intentions: ["INT-001", "INT-002"]
  expectations: []
  status: "ready"
  note: "This is a foundational Spec — it produces the project skeleton, Docker dev environment, and Prisma schema that all subsequent Specs build on. It does not implement UI or API routes."

  context:
    # Inherits full Product context above.
    additional:
      - "This Spec creates the initial project from scratch"
      - "SQL Server 2022 container for development; Azure SQL for production"
      - "Prisma schema must cover all entities needed for MVP: Products, Intentions, Expectations, Specs, PhaseTransitions, SpecExpectations (join table), IntentionDependencies (self-join)"

  expectations:
    - description: "docker-compose.yml starts a working dev environment with app container and SQL Server container"
      validation: "docker compose up starts both containers; app container serves on localhost:3000; SQL Server accessible on localhost:1433"
      edge_cases:
        - "Port 1433 already in use → compose file uses configurable port via .env"
        - "First run with empty database → Prisma migration applies automatically on startup"

    - description: "Prisma schema defines all entities with correct relationships, constraints, and indexes"
      validation: "npx prisma migrate dev succeeds; npx prisma generate produces typed client; all foreign keys and cascade rules correct"
      edge_cases:
        - "Schema supports sqlserver provider specifically (not generic SQL)"
        - "JSON columns for Context, Boundaries, Deliverables, Validation use String type with JSON serialization (SQL Server Prisma limitation)"

    - description: "Express server starts and serves a health check endpoint"
      validation: "GET /api/health returns { status: 'ok', timestamp: ... }"
      edge_cases:
        - "Database unreachable → health check returns { status: 'degraded', database: 'unreachable' }"

    - description: "Vite dev server proxies /api/* to Express backend"
      validation: "Frontend fetch to /api/health returns Express response; HMR works for React changes"

    - description: "Auth middleware is in place with dev bypass"
      validation: "BYPASS_AUTH=true in .env allows unauthenticated requests in dev; BYPASS_AUTH=false requires valid Entra JWT"

  boundaries:
    - "Do not implement any UI pages or React components beyond a placeholder App.tsx"
    - "Do not implement any CRUD API routes — only health check"
    - "Do not configure Azure Container Apps or CI/CD — that is a deployment Spec"
    - "Do not implement seed data — that comes with SPEC-002"

  deliverables:
    - "docker-compose.yml with app and SQL Server containers"
    - "Dockerfile (multi-stage: build + production)"
    - ".env.example with all required environment variables"
    - "package.json with all dependencies"
    - "tsconfig.json, tsconfig.server.json, tsconfig.client.json"
    - "vite.config.ts with API proxy"
    - "tailwind.config.ts and global CSS with shadcn/ui setup"
    - "prisma/schema.prisma with full data model"
    - "Initial Prisma migration"
    - "src/server/index.ts (Express entry with health check)"
    - "src/server/middleware/auth.ts (Entra JWT validation with dev bypass)"
    - "src/client/main.tsx (placeholder React app)"
    - "src/shared/types/ (TypeScript interfaces for all entities)"
    - "src/shared/schemas/ (Zod schemas for all entities)"

  validation:
    automated:
      - "docker compose up succeeds and both containers are healthy"
      - "npx prisma migrate dev applies without errors"
      - "GET /api/health returns 200"
      - "TypeScript compiles without errors (tsc --noEmit)"
      - "Vite dev server starts and proxies API calls"
    human_review:
      - "Project structure matches documented layout"
      - "Prisma schema accurately represents the IDD data model"
      - ".env.example is complete and well-commented"
```

### SPEC-002: Product CRUD and Detail View

```yaml
spec:
  id: "SPEC-002"
  product: "PROD-001"
  intentions: ["INT-001"]
  expectations: ["EXP-001", "EXP-002", "EXP-003"]
  status: "ready"

  context:
    # Inherits full Product context.
    additional:
      - "Builds on SPEC-001 project skeleton"
      - "First real UI and API implementation — establishes patterns all other CRUD Specs will follow"

  expectations:
    - id: "EXP-001"
      description: "Product CRUD with required field enforcement"
      validation: "Create, read, update forms with Zod validation; list view; detail view; API routes with request validation"
      edge_cases:
        - "Empty required field → inline validation error on client; 400 response from API"
        - "Long text (2000+ chars) → accepted, displayed without truncation"
        - "Duplicate name → allowed"

    - id: "EXP-002"
      description: "Product detail view with Intention summary and status breakdown"
      validation: "Detail page shows all fields, child Intention count by status, progress indicator"
      edge_cases:
        - "Zero Intentions → empty state with CTA to create first Intention"
        - "50+ Intentions → paginated, performant"

    - id: "EXP-003"
      description: "Configurable Context block on Product with inheritance"
      validation: "Context editor with structured fields for stack, patterns, conventions, auth; saved as JSON to Product record"
      edge_cases:
        - "Empty context → completeness check on child Specs will flag it"
        - "Context updated → existing Specs keep snapshot; new Specs get latest"

  boundaries:
    - "Do not implement Team/multi-user features — single user assumed for MVP"
    - "Do not implement metrics calculations"
    - "Do not build a custom rich text editor — use textarea and standard inputs"
    - "Do not implement file uploads or image attachments"

  deliverables:
    - "API routes: GET/POST /api/products, GET/PUT/DELETE /api/products/:id"
    - "Product list page component"
    - "Product create/edit form component with Zod validation"
    - "Product detail page component with Context editor"
    - "React Query hooks for Product CRUD"
    - "Prisma seed script with 1-2 example Products"

  validation:
    automated:
      - "All required fields enforced at API level (400 on missing fields)"
      - "Product CRUD round-trip: create → read → update → verify"
      - "Context block saves and retrieves JSON correctly"
    human_review:
      - "Form UX: field ordering, labels, error messages"
      - "Detail page layout and information hierarchy"
      - "Patterns established here will be followed by all subsequent CRUD Specs"
```

### SPEC-003: Intent Hierarchy (Intentions, Expectations, Specs CRUD)

```yaml
spec:
  id: "SPEC-003"
  product: "PROD-001"
  intentions: ["INT-002"]
  expectations: ["EXP-004", "EXP-005", "EXP-006", "EXP-007"]
  status: "ready"

  context:
    # Inherits full Product context.
    additional:
      - "Builds on SPEC-002 patterns for CRUD and page components"
      - "Parent-child relationships via foreign keys with cascade rules"
      - "Spec entity stores Context, Boundaries, Deliverables, Validation as JSON columns"
      - "SpecExpectations join table enables many-to-many: one Spec links to multiple Expectations"

  expectations:
    - id: "EXP-004"
      description: "Intention CRUD as children of Product"
      validation: "Create within Product context; required fields enforced; dependency selection from sibling Intentions"
      edge_cases:
        - "Circular dependency → rejected with clear error message"
        - "Dependency on Deferred Intention → allowed with visual warning"
        - "Delete with children → blocked with message listing child Expectations"

    - id: "EXP-005"
      description: "Expectation CRUD as children of Intention"
      validation: "Create within Intention context; minimum 2 edge cases enforced"
      edge_cases:
        - "Fewer than 2 edge cases → validation error, cannot save"
        - "No Spec linked → allowed in Draft"
        - "Reassign to different Intention → relationship updates, history preserved"

    - id: "EXP-006"
      description: "Spec CRUD linked to Expectations"
      validation: "Create with structured sections; links to Expectations via multi-select; visible on flow board after creation"
      edge_cases:
        - "Cross-Intention Expectations → allowed; UI shows cross-Intention indicator"
        - "All Expectations deleted → Spec flagged orphaned"
        - "Empty boundaries → allowed but completeness check flags it"

    - id: "EXP-007"
      description: "Full hierarchy navigation with breadcrumbs"
      validation: "Click-through at every level; breadcrumb trail shows full ancestry"
      edge_cases:
        - "Deep hierarchy (20/100/50) → responsive"
        - "Orphaned Spec → navigable but flagged"

  boundaries:
    - "Do not implement drag-and-drop reordering of Intentions or Expectations"
    - "Do not implement bulk operations"
    - "Do not implement comments or discussion threads"
    - "Dependency validation only for Intentions; not for Expectations or Specs"
    - "Spec editor is basic form fields here — structured editor with collapsible sections is SPEC-004"

  deliverables:
    - "API routes for Intentions CRUD (nested under /api/products/:productId/intentions)"
    - "API routes for Expectations CRUD (nested under /api/intentions/:intentionId/expectations)"
    - "API routes for Specs CRUD (/api/specs with expectation linking)"
    - "Intention list and detail page components"
    - "Expectation list and detail page components"
    - "Spec list and basic detail page components"
    - "Breadcrumb navigation component"
    - "Intention dependency selector with circular dependency detection"
    - "React Query hooks for all CRUD operations"
    - "Seed script with example Intentions, Expectations, and Specs"

  validation:
    automated:
      - "Parent-child referential integrity enforced at database level"
      - "Circular dependency detection rejects invalid configurations"
      - "Minimum 2 edge cases enforced on Expectation create/update"
      - "Breadcrumb renders correct ancestry at every level"
    human_review:
      - "Navigation UX: is the hierarchy intuitive?"
      - "Edge case validation messages are clear"
      - "Pattern consistency with SPEC-002"
```

### SPEC-004: Spec Structured Editor and Export

```yaml
spec:
  id: "SPEC-004"
  product: "PROD-001"
  intentions: ["INT-004"]
  expectations: ["EXP-011", "EXP-012", "EXP-013"]
  status: "ready"

  context:
    # Inherits full Product context.
    additional:
      - "Replaces the basic Spec form from SPEC-003 with a structured editor"
      - "Uses js-yaml for YAML serialization on export"
      - "Collapsible section pattern: each Spec block is a discrete component"
      - "Context inheritance: on Spec create, pull Product.context into Spec.context as starting point"

  expectations:
    - id: "EXP-011"
      description: "Structured Spec editor with five collapsible sections"
      validation: "Sections: Context, Expectations, Boundaries, Deliverables, Validation; appropriate field types; consistent ordering"
      edge_cases:
        - "Context pre-populated from Product → diff indicator on overrides"
        - "Large Spec (20+ Expectations, 30+ edge cases) → section collapse keeps editor performant"

    - id: "EXP-012"
      description: "YAML export matching canonical Spec schema"
      validation: "Export button; downloads valid YAML file; all fields present"
      edge_cases:
        - "Inherited context → resolved (merged) in export"
        - "Special characters → properly escaped"
        - "Draft Spec → exported with status: draft"

    - id: "EXP-013"
      description: "Markdown prompt export for AI agent sessions"
      validation: "Single Markdown document; clear sections; context inline; expectations as checklist"
      edge_cases:
        - "Preamble included for AI agent orientation"
        - "Export > 8000 tokens → warning displayed"

  boundaries:
    - "Do not implement in-browser YAML validation or linting"
    - "Do not implement version history or diff on Specs"
    - "Do not implement collaborative editing"
    - "Export is download only; no direct AI agent integration"

  deliverables:
    - "Spec structured editor component with five collapsible sections"
    - "Context diff indicator component (inherited vs. overridden)"
    - "Dynamic list editor component (reusable for boundaries, deliverables, edge cases)"
    - "YAML export function with download trigger"
    - "Markdown prompt export function with download trigger"
    - "Token estimation utility (word count × 1.3)"
    - "Context inheritance logic: snapshot Product.context on Spec create"

  validation:
    automated:
      - "Exported YAML parses without errors"
      - "All Spec fields present in export"
      - "Context inheritance resolves correctly"
      - "Token warning triggers at threshold"
    human_review:
      - "Editor UX: is the structured approach intuitive?"
      - "Export quality: paste Markdown export into Claude Code and assess output"
      - "Context diff indicator is clear"
```

### SPEC-005: Spec Completeness Checklist

```yaml
spec:
  id: "SPEC-005"
  product: "PROD-001"
  intentions: ["INT-005"]
  expectations: ["EXP-014"]
  status: "ready"

  context:
    # Inherits full Product context.
    additional:
      - "Checklist evaluator runs client-side against current Spec data"
      - "Displays as a sidebar or collapsible panel on the Spec detail/editor view"
      - "Integrates with flow board gate logic in SPEC-006"

  expectations:
    - id: "EXP-014"
      description: "Completeness checklist with defined criteria; pass/fail per item; gate enforcement"
      validation: "Checklist panel on Spec detail; real-time evaluation as Spec is edited; overall score as fraction and progress bar"
      checklist_criteria:
        - "Context: stack field is non-empty"
        - "Context: patterns field is non-empty"
        - "Context: conventions has at least one entry"
        - "Context: auth field is non-empty"
        - "At least one Expectation linked"
        - "All linked Expectations have validation criteria"
        - "All linked Expectations have at least 2 edge cases"
        - "Boundaries block has at least one entry"
        - "Deliverables block has at least one entry"
        - "Validation block has at least one automated and one human review item"
        - "Spec has been peer-reviewed (review flag set)"
      edge_cases:
        - "Criteria updated after Specs marked Ready → existing Ready Specs not retroactively blocked"
        - "All criteria pass → visual indicator, Draft → Ready gate unblocked"
        - "Checklist re-evaluates in real-time as user edits"

  boundaries:
    - "Do not implement custom/configurable checklist criteria (fixed set for MVP)"
    - "Do not implement peer review workflow (review flag is a manual toggle)"
    - "Checklist gates Draft → Ready only; does not block other transitions"

  deliverables:
    - "Completeness checklist evaluator function (pure function: Spec data → checklist results)"
    - "Checklist display component (sidebar with pass/fail indicators and progress bar)"
    - "Integration with Spec editor view"
    - "Shared evaluator function usable by both client (real-time) and server (gate enforcement)"

  validation:
    automated:
      - "Each criterion correctly evaluates against Spec data"
      - "Checklist updates in real-time as Spec fields change"
      - "Evaluator function returns consistent results on client and server"
    human_review:
      - "Checklist UX: is it clear what is missing and how to fix it?"
```

### SPEC-006: Flow Board with WIP Limits and Gates

```yaml
spec:
  id: "SPEC-006"
  product: "PROD-001"
  intentions: ["INT-003"]
  expectations: ["EXP-008", "EXP-009", "EXP-010"]
  status: "ready"

  context:
    # Inherits full Product context.
    additional:
      - "Uses @dnd-kit/core and @dnd-kit/sortable for drag-and-drop"
      - "Phase columns: Draft, Ready, In Progress, Review, Validating, Done"
      - "All phase transitions logged to PhaseTransitions table for metrics"
      - "Gate logic uses completeness evaluator from SPEC-005"

  expectations:
    - id: "EXP-008"
      description: "Kanban flow board with six phase columns"
      validation: "Board renders; Specs as cards; drag-and-drop between columns"
      edge_cases:
        - "Zero Specs → empty state with guidance"
        - "100+ Specs → vertical scroll per column"
        - "Backward move → allowed, logged as return"

    - id: "EXP-009"
      description: "Configurable WIP limits per phase"
      validation: "Settings for limits; header shows count/limit; warning on exceed; confirmation to override"
      edge_cases:
        - "Limit 0 → unlimited"
        - "Limit reduced below current → blocks new entries only"
        - "Per-team configuration"

    - id: "EXP-010"
      description: "Validation gates on phase transitions"
      validation: "Draft → Ready requires completeness pass; Review → Validating requires approved review"
      edge_cases:
        - "Gate override → allowed with captured reason"
        - "Expectation modified post-gate → Spec flagged for re-review"

  boundaries:
    - "Do not implement swimlanes"
    - "Do not implement card filtering or search on the board"
    - "Do not implement real-time collaboration (refresh to see others' changes)"
    - "Six phases are fixed — no custom columns for MVP"

  deliverables:
    - "Flow board page component with six columns"
    - "Spec card component with ID, title, priority badge, days-in-phase counter"
    - "Drag-and-drop interaction with gate validation on drop"
    - "WIP limit configuration UI (Product settings page)"
    - "Phase transition API endpoint (POST /api/specs/:id/transition)"
    - "PhaseTransitions table logging (spec_id, from_phase, to_phase, timestamp, user_id, override_reason)"
    - "Gate validation logic integrated with completeness evaluator"

  validation:
    automated:
      - "Drag-and-drop moves Specs between phases and persists"
      - "WIP limit enforcement blocks drops when at limit"
      - "Gate validation prevents Draft → Ready without passing checklist"
      - "Phase transitions logged correctly with all fields"
    human_review:
      - "Board UX: card readability, drag responsiveness"
      - "Gate messaging: are rejection reasons clear and actionable?"
```

---

## BUILD ORDER

| Order | Spec | What It Produces | Depends On |
|-------|------|------------------|------------|
| 1 | SPEC-001 | Project skeleton, Docker, Prisma schema, auth middleware | Nothing |
| 2 | SPEC-002 | Product CRUD, Context editor — establishes UI/API patterns | SPEC-001 |
| 3 | SPEC-003 | Intent hierarchy CRUD, breadcrumbs, navigation | SPEC-002 |
| 4 | SPEC-005 | Completeness checklist evaluator | SPEC-003 |
| 5 | SPEC-004 | Structured Spec editor, export functions | SPEC-003 |
| 6 | SPEC-006 | Flow board, WIP limits, gates | SPEC-004, SPEC-005 |

---

## DEFERRED (Post-MVP)

| ID | Description | Reason |
|---|---|---|
| INT-006 / SPEC-007 | Metrics dashboard | Needs phase transition data to be useful |
| INT-007 / EXP-018 | Context templates | Manual inheritance covers MVP |
| INT-008 / EXP-019, EXP-020 | Multi-team, portfolio view | MVP targets single team |
| Future | Entra group-based authorization | MVP uses auth for identity; all authenticated users have full access; role-based access comes later |
| Future | Azure Container Apps deployment pipeline | Manual deployment acceptable for pilot; CI/CD automated post-validation |
| Future | Version history / diff on Specs | Valuable but complex |
| Future | Direct AI agent integration (API) | MVP uses export/copy-paste |
| Future | Comments / discussion on artifacts | Defer until multi-user patterns validated |
| Future | Notifications | Defer until workflow validated |

---

## DATA MODEL REFERENCE

```
Products
  ├── id (UUID, PK)
  ├── name (String, required)
  ├── problem_statement (String, required)
  ├── target_audience (String, required)
  ├── value_proposition (String, required)
  ├── strategic_alignment (String)
  ├── owner (String, required)
  ├── status (Enum: Discovery, Active, Maintenance, Sunset)
  ├── context (JSON: { stack, patterns, conventions, auth })
  ├── wip_limits (JSON: { draft, ready, in_progress, review, validating })
  ├── created_at, updated_at, archived_at
  │
  └── Intentions
      ├── id (UUID, PK)
      ├── product_id (FK → Products)
      ├── statement (String, required)
      ├── rationale (String, required)
      ├── priority (Enum: Critical, High, Medium, Low)
      ├── owner (String)
      ├── status (Enum: Draft, Defined, In Progress, Fulfilled, Deferred)
      ├── created_at, updated_at, archived_at
      │
      ├── IntentionDependencies (self-join)
      │   ├── intention_id (FK → Intentions)
      │   └── depends_on_id (FK → Intentions)
      │
      └── Expectations
          ├── id (UUID, PK)
          ├── intention_id (FK → Intentions)
          ├── description (String, required)
          ├── validation_criteria (String, required)
          ├── edge_cases (JSON array, min 2 items)
          ├── complexity (Enum: Low, Medium, High)
          ├── owner (String)
          ├── status (Enum: Draft, Ready, Specced, Validated, Done)
          ├── created_at, updated_at, archived_at

Specs
  ├── id (UUID, PK)
  ├── product_id (FK → Products)
  ├── title (String, required)
  ├── phase (Enum: Draft, Ready, InProgress, Review, Validating, Done)
  ├── context (JSON: snapshot from Product + overrides)
  ├── boundaries (JSON array of strings)
  ├── deliverables (JSON array of strings)
  ├── validation_automated (JSON array of strings)
  ├── validation_human (JSON array of strings)
  ├── peer_reviewed (Boolean, default false)
  ├── owner (String)
  ├── created_at, updated_at, archived_at
  │
  ├── SpecExpectations (join table)
  │   ├── spec_id (FK → Specs)
  │   └── expectation_id (FK → Expectations)
  │
  └── PhaseTransitions (log table)
      ├── id (UUID, PK)
      ├── spec_id (FK → Specs)
      ├── from_phase (Enum)
      ├── to_phase (Enum)
      ├── timestamp (DateTime)
      ├── user_id (String — Entra OID)
      ├── override_reason (String, nullable)
```
