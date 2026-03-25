# CLI Distribution for idd-forge

**Date:** 2026-03-25
**Status:** Approved

## Problem

Forge currently runs only from its own repo via `npm run dev`. Users in other repos have no way to spin up a Forge session to visualize and edit their IDD artifacts.

## Solution

Rename and polish the package for npm distribution as `@jasonrobey-burke/idd-forge`. Enhance the CLI entry point with argument parsing, interactive init prompt, and browser auto-open. Publish to Azure DevOps Artifacts and/or GitHub Packages.

## Design

### Package Identity

- **Name:** `@jasonrobey-burke/idd-forge`
- **Version:** `0.3.0`
- **Bin command:** `idd-forge`
- **Engines:** `node >= 20`
- **New dependency:** `open` (cross-platform browser launcher)

User experience:
```bash
# After .npmrc is configured for the registry
npx @jasonrobey-burke/idd-forge

# Or after global install
idd-forge
```

### CLI Entry Point (`bin/idd-forge.js`)

Replaces `bin/forge.js`. Handles:

**Arguments** (manual `process.argv` parsing, no dependencies):
- `--port <number>` — server port (default: 4000)
- `--docs <path>` — docs directory (default: `./docs`)
- `--no-open` — suppress browser auto-open
- `--help` / `-h` — print usage and exit
- `--version` / `-v` — print version from package.json and exit

**Precedence for docs directory:** `--docs` flag > `FORGE_DOCS` env var > `./docs` default. The `FORGE_DOCS` environment variable is preserved for backward compatibility.

**Init prompt** (Node built-in `readline`):
- If docs directory doesn't exist, prompt: "Create IDD directory structure? [Y/n]"
- On Y: create `docs/{products,intentions,expectations,specs,reviews}/` directories
- On n: exit with message

**Browser open:**
- After server starts, open the URL in the default browser using the `open` package
- Suppressed by `--no-open` flag

**Dev/prod detection:**
- Preserved from existing `bin/forge.js` — if `src/server/index.ts` exists, run via tsx; otherwise use compiled `dist/server/index.js`

### Startup Output

```
  idd-forge v0.3.0

  Reading artifacts from ./docs
  Found: 1 product, 3 intentions, 6 expectations, 3 specs

  ➜  http://localhost:4000

  Press Ctrl+C to stop
```

When docs/ missing and user accepts init:

```
  idd-forge v0.3.0

  No docs/ directory found at ./docs
  ? Create IDD directory structure? (Y/n) Y

  Created docs/products/
  Created docs/intentions/
  Created docs/expectations/
  Created docs/specs/
  Created docs/reviews/

  Reading artifacts from ./docs
  Found: 0 products, 0 intentions, 0 expectations, 0 specs

  ➜  http://localhost:4000

  Press Ctrl+C to stop
```

Plain text output, no color dependencies.

### Build and Publish

Build stays the same: `npm run build` produces `dist/` with compiled server and bundled client.

**Published contents** (via `files` field):
- `bin/idd-forge.js`
- `dist/server/` — compiled Express server
- `dist/client/` — Vite-built React SPA
- `package.json`

**Not shipped:** `src/`, `e2e/`, `docs/`, test files, dev configs.

**Publishing to Azure DevOps Artifacts:**
```bash
# Authenticate
npx vsts-npm-auth -config .npmrc
# Publish
npm publish
```

**Publishing to GitHub Packages:**
```bash
# With GITHUB_TOKEN set and .npmrc configured
npm publish
```

**Consumer `.npmrc` setup:**
```ini
# Azure DevOps
@jasonrobey-burke:registry=https://pkgs.dev.azure.com/ORG/_packaging/FEED/npm/registry/

# OR GitHub Packages
@jasonrobey-burke:registry=https://npm.pkg.github.com
```

### Changes Summary

**Renamed:** `bin/forge.js` → `bin/idd-forge.js`
**Modified:** `package.json` (name, version, bin, description, engines, open dependency)
**New:** `README.md` (install/usage instructions)
**Unchanged:** `src/server/`, `src/client/`, build process, YAML store, API

## Scope Boundaries

- No CI/CD pipeline setup
- No `.npmrc` files committed to the repo
- No changes to the web UI
- No changes to the YAML store or API
- No changes to the IDD plugin integration
