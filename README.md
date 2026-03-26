# idd-forge

Repo-local web UI for [Intent-Driven Development](https://github.com/JasonRobey-Burke/Forge) artifacts. No database, no Docker, no auth — just `npx @jasonrobey-burke/idd-forge` in any repo with a `docs/` directory.

## Quick Start

```bash
npm install -D @jasonrobey-burke/idd-forge --legacy-peer-deps
npx idd-forge
```

Forge scans `docs/` for YAML artifacts (Products, Intentions, Expectations, Specs) and serves a local web UI at `http://localhost:4000`.

## Installation

### Step 1: Create a GitHub Personal Access Token

Go to **GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)** and create a token with the `read:packages` scope.

### Step 2: Configure `.npmrc` in your repo

Create a `.npmrc` file in the root of the repo where you want to use Forge:

```ini
@jasonrobey-burke:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

Replace `YOUR_GITHUB_TOKEN` with the token from Step 1. Add `.npmrc` to your `.gitignore` to avoid committing the token.

### Step 3: Install and Run Forge

```bash
npm install -D @jasonrobey-burke/idd-forge --legacy-peer-deps
npx idd-forge
```

The first command installs Forge as a dev dependency. The `--legacy-peer-deps` flag avoids conflicts with your project's existing dependencies. After that, `npx idd-forge` starts the server and opens a browser to `http://localhost:4000`.

> **Why not `npx @jasonrobey-burke/idd-forge` directly?** There's a known issue with npx on Windows that prevents scoped packages from creating command shims. Installing locally first works reliably on all platforms.

### Alternative: Azure DevOps Artifacts

If your team uses Azure DevOps, configure `.npmrc` with your feed instead:

```ini
@jasonrobey-burke:registry=https://pkgs.dev.azure.com/YOUR_ORG/_packaging/YOUR_FEED/npm/registry/
//pkgs.dev.azure.com/YOUR_ORG/_packaging/YOUR_FEED/npm/:_authToken=YOUR_TOKEN
```

Then:

```bash
npm install -D @jasonrobey-burke/idd-forge --legacy-peer-deps
npx idd-forge
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
