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

### Step 1: Create a GitHub Personal Access Token

Go to **GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)** and create a token with the `read:packages` scope.

### Step 2: Configure `.npmrc` in your repo

Create a `.npmrc` file in the root of the repo where you want to use Forge:

```ini
@jasonrobey-burke:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

Replace `YOUR_GITHUB_TOKEN` with the token from Step 1. Add `.npmrc` to your `.gitignore` to avoid committing the token.

### Step 3: Install and Run

```bash
npm install -D @jasonrobey-burke/idd-forge --legacy-peer-deps
npx idd-forge
```

Forge scans `docs/` for IDD artifacts and opens a browser to `http://localhost:4000`. If `docs/` doesn't exist, it will offer to create the directory structure for you.

> **Why not `npx @jasonrobey-burke/idd-forge` directly?** There's a known issue with npx on Windows that prevents scoped packages from creating command shims. Installing locally first works reliably on all platforms.

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
└── .npmrc              (registry config, gitignored)
```

Changes to YAML files are detected in real time — edit files with the IDD Claude Code plugin or any editor, and the UI updates automatically.

## Requirements

- Node.js 20 or later

## Project Status

- Current implementation review and remaining-work breakdown: `docs/implementation-status.md`
