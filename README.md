# Forge

**Where intent becomes software.**

Forge is a local dev tool for [Intent-Driven Development (IDD)](docs/forge-product-definition-v1.1.md). It reads YAML artifacts from your repo's `docs/` directory and provides a web UI for viewing, editing, and managing the flow of Specs through a Kanban lifecycle.

## Quick Start

```bash
# In any repo with IDD YAML files in docs/
npx forge
```

Open [http://localhost:4000](http://localhost:4000) to see your artifacts.

## What It Does

Forge visualizes and edits the IDD artifact hierarchy:

```
Product → Intentions → Expectations → Specs
```

- **Products** define what you're building (problem, audience, tech context)
- **Intentions** capture what the product needs to *be* ("Teams can...")
- **Expectations** are testable outcomes with edge cases
- **Specs** are AI-ready work artifacts that flow through phases

### Flow Board

Specs move through a Kanban lifecycle with validation gates:

```
Draft → Ready → In Progress → Review → Validating → Done
```

- **WIP limits** prevent phase overload
- **Completeness checklist** gates Draft → Ready (11 criteria)
- **Peer review** gate for Review → Validating
- **Drag-and-drop** transitions on the Flow Board

### Live Refresh

When an AI agent (or any tool) modifies a YAML file in `docs/`, Forge detects the change and refreshes the UI automatically. No manual reload needed.

## Expected Directory Structure

```
your-repo/
├── docs/
│   ├── products/          # PROD-001.yaml, ...
│   ├── intentions/        # INT-001.yaml, ...
│   ├── expectations/      # EXP-001.yaml, ...
│   ├── specs/             # SPEC-001.yaml, ...
│   └── reviews/           # SPEC-001-review.md, ...
└── ...
```

YAML files are created by the IDD Claude Code plugin. Forge reads and edits them — it does not create or delete files.

## Configuration

| Environment Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | Server port |
| `FORGE_DOCS` | `./docs` | Path to the docs directory containing YAML artifacts |

## YAML Schema

Forge reads the YAML schema produced by the IDD plugin. See the sample files in `docs/` for reference.

**Product** (`docs/products/PROD-001.yaml`):
```yaml
product:
  id: PROD-001
  name: "My Product"
  status: Active
  problem: "..."
  audience: { primary: "..." }
  value_proposition: "..."
  technical_context:
    stack: [...]
    patterns: [...]
    conventions: [...]
    auth: "..."
  wip_limits: { draft: 0, ready: 5, in_progress: 3, review: 5, validating: 3 }
```

**Spec** (`docs/specs/SPEC-001.yaml`):
```yaml
spec:
  id: SPEC-001
  product_id: PROD-001
  title: "..."
  description: "..."
  status: Ready          # Maps to phase: Draft|Ready|InProgress|Review|Validating|Done
  complexity: Medium
  expectations: [EXP-001, EXP-002]
  context: { stack: [...], patterns: [...], conventions: [...], auth: "..." }
  boundaries: [...]
  deliverables: [...]
  validation: { automated: [...], human: [...], peer_reviewed: false }
  phase_history:
    - { from: Draft, to: Ready, timestamp: "2026-03-20T14:00:00Z" }
```

## Development

```bash
# Install dependencies
npm install

# Start dev server (Express + Vite with hot reload)
npm run dev

# Type-check
npm run typecheck

# Run tests
npm test

# Build for production
npm run build
```

## Tech Stack

- React 19 + TypeScript + Vite 8 + Tailwind CSS 3 + shadcn/ui
- Express.js 5 (TypeScript)
- In-memory YAML store (no database)
- chokidar for file watching
- @dnd-kit for drag-and-drop
- React Query for server state

## License

Private — Burke & Associates
