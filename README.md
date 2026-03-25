# idd-forge

Repo-local web UI for [Intent-Driven Development](https://github.com/JasonRobey-Burke/Forge) artifacts. No database, no Docker, no auth — just `npx @jasonrobey-burke/idd-forge` in any repo with a `docs/` directory.

## Quick Start

```bash
npx @jasonrobey-burke/idd-forge
```

Forge scans `docs/` for YAML artifacts (Products, Intentions, Expectations, Specs) and serves a local web UI at `http://localhost:4000`.

## Installation

### GitHub Packages

Add to your project's `.npmrc`:

```ini
@jasonrobey-burke:registry=https://npm.pkg.github.com
```

Then:

```bash
npx @jasonrobey-burke/idd-forge
```

### Azure DevOps Artifacts

Add to your project's `.npmrc`:

```ini
@jasonrobey-burke:registry=https://pkgs.dev.azure.com/YOUR_ORG/_packaging/YOUR_FEED/npm/registry/
```

Then:

```bash
npx @jasonrobey-burke/idd-forge
```

### Global Install

```bash
npm install -g @jasonrobey-burke/idd-forge
idd-forge
```

## CLI Options

```
idd-forge [options]

Options:
  --port <number>   Server port (default: 4000)
  --docs <path>     Path to docs directory (default: ./docs)
  --no-open         Don't open browser automatically
  -h, --help        Show help
  -v, --version     Show version
```

## How It Works

Forge reads YAML files from the IDD directory structure:

```
your-repo/
├── docs/
│   ├── products/       PROD-001.yaml
│   ├── intentions/     INT-001.yaml
│   ├── expectations/   EXP-001.yaml
│   ├── specs/          SPEC-001.yaml
│   └── reviews/        SPEC-001-review.md
└── .npmrc              (registry config)
```

If `docs/` doesn't exist, Forge will offer to create the directory structure for you.

Changes to YAML files are detected in real-time — edit files with the IDD Claude Code plugin or any editor, and the UI updates automatically.

## Requirements

- Node.js 20 or later
