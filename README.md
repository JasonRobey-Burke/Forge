# idd-forge

Repo-local web UI for [Intent-Driven Development](https://github.com/JasonRobey-Burke/Forge) (IDD) artifacts. Reads and writes YAML files produced by the IDD Claude Code plugin — no database, no Docker, no auth.

## What It Does

- **Flow Board** — Kanban view of all Specs across six phases (Draft → Ready → In Progress → Review → Validating → Done) with drag-and-drop and WIP limits
- **Artifact hierarchy** — Browse Products, Intentions, Expectations, and Specs with full detail and inline editing
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

## Requirements

- Node.js 20 or later

## Project Status

- Current implementation review and remaining-work breakdown: `docs/implementation-status.md`
