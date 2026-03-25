# CLI Distribution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Package Forge as `@jasonrobey-burke/idd-forge` with a polished CLI that handles arg parsing, init prompt, and browser auto-open.

**Architecture:** Rename `bin/forge.js` to `bin/idd-forge.js` with enhanced CLI logic (arg parsing, readline-based init prompt, `open` for browser). Update `package.json` identity. Modify `startServer()` to return the URL so the CLI knows when to open the browser. Add README with install/usage docs.

**Tech Stack:** Node.js 20+, `open` package, readline (built-in)

**Spec:** `docs/superpowers/specs/2026-03-25-cli-distribution-design.md`

---

## File Structure

**New files:**
- `bin/idd-forge.js` — enhanced CLI entry point (replaces `bin/forge.js`)
- `README.md` — install and usage documentation

**Modified files:**
- `package.json` — name, version, bin, description, engines, open dependency
- `src/server/index.ts` — modify `startServer()` to resolve with `{ app, url }` after listen

**Deleted files:**
- `bin/forge.js` — replaced by `bin/idd-forge.js`

---

### Task 1: Update package.json Identity

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Update package identity fields**

In `package.json`, make these changes:

```json
{
  "name": "@jasonrobey-burke/idd-forge",
  "version": "0.3.0",
  "description": "Repo-local web UI for Intent-Driven Development artifacts",
  "type": "module",
  "bin": {
    "idd-forge": "./bin/idd-forge.js"
  },
  "files": [
    "dist/",
    "bin/"
  ],
  "engines": {
    "node": ">=20"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/JasonRobey-Burke/Forge.git"
  },
  "license": "MIT",
  "keywords": ["idd", "intent-driven-development", "spec-management", "yaml", "forge"]
}
```

Keep all existing `scripts`, `dependencies`, and `devDependencies` unchanged.

- [ ] **Step 2: Add `open` as a production dependency**

Run:
```bash
npm install open
```

- [ ] **Step 3: Verify**

Run: `npm run typecheck`
Expected: passes

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: rename package to @jasonrobey-burke/idd-forge v0.3.0

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Modify startServer to Return URL

**Files:**
- Modify: `src/server/index.ts`

The CLI needs to know when the server is listening and on what URL so it can open the browser. Currently `app.listen()` fires a callback but `startServer()` returns `app` synchronously before the listen completes.

- [ ] **Step 1: Update startServer return type and listen logic**

Change the `app.listen` block (lines 86-88) and return statement (line 90) to:

```typescript
  const quiet = process.env.FORGE_QUIET === '1';

  return new Promise<{ app: typeof app; url: string }>((resolve) => {
    app.listen(port, () => {
      const url = `http://localhost:${port}`;
      if (!quiet) console.log(`Forge running at ${url}`);
      resolve({ app, url });
    });
  });
```

Also guard the existing stats output (lines 26-27) with the quiet check:

```typescript
  if (!quiet) {
    console.log(`Forge reading artifacts from ${docsDir}`);
    console.log(`Found: ${stats.products} product(s), ${stats.intentions} intention(s), ${stats.expectations} expectation(s), ${stats.specs} spec(s)`);
  }
```

Update the `ServerOptions` return type — `startServer` now returns `Promise<{ app: Express; url: string }>`.

Also update the auto-start block at the bottom (lines 94-99) to use `await`:

```typescript
const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('index.ts') ||
  process.argv[1].endsWith('index.js')
);
if (isDirectRun) {
  await startServer();
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: passes

- [ ] **Step 3: Verify dev server still works**

Run: `npm run dev`
Verify: server starts, client loads at the Vite URL

- [ ] **Step 4: Commit**

```bash
git add src/server/index.ts
git commit -m "refactor: startServer returns Promise with url for CLI integration

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Create Enhanced CLI Entry Point

**Files:**
- Create: `bin/idd-forge.js`
- Delete: `bin/forge.js`

This is the main task. The new CLI handles:
1. `--help` / `-h` — print usage
2. `--version` / `-v` — print version
3. `--port <n>` — server port
4. `--docs <path>` — docs directory
5. `--no-open` — suppress browser
6. Init prompt if docs/ missing
7. Start server
8. Open browser

- [ ] **Step 1: Create bin/idd-forge.js**

```js
#!/usr/bin/env node

import { existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { createInterface } from 'readline';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const pkg = require('../package.json');

// ── Arg parsing ────────────────────────────────────────────
const args = process.argv.slice(2);

function getFlag(name) {
  const i = args.indexOf(name);
  return i !== -1;
}

function getOption(name, fallback) {
  const i = args.indexOf(name);
  if (i !== -1 && i + 1 < args.length) return args[i + 1];
  // Support --name=value
  const eq = args.find(a => a.startsWith(name + '='));
  if (eq) return eq.split('=')[1];
  return fallback;
}

if (getFlag('--help') || getFlag('-h')) {
  console.log(`
  idd-forge v${pkg.version}
  Repo-local web UI for Intent-Driven Development artifacts

  Usage: idd-forge [options]

  Options:
    --port <number>   Server port (default: 4000)
    --docs <path>     Path to docs directory (default: ./docs)
    --no-open         Don't open browser automatically
    -h, --help        Show this help message
    -v, --version     Show version number
  `);
  process.exit(0);
}

if (getFlag('--version') || getFlag('-v')) {
  console.log(pkg.version);
  process.exit(0);
}

const port = parseInt(getOption('--port', process.env.PORT ?? '4000'));
const docsDir = resolve(
  getOption('--docs', undefined) ?? process.env.FORGE_DOCS ?? './docs'
);
const noOpen = getFlag('--no-open');

console.log(`\n  idd-forge v${pkg.version}\n`);

// ── Init prompt ────────────────────────────────────────────
async function promptInit() {
  console.log(`  No docs/ directory found at ${docsDir}`);
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question('  ? Create IDD directory structure? (Y/n) ', (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() !== 'n');
    });
  });
}

function createDocsStructure() {
  const dirs = ['products', 'intentions', 'expectations', 'specs', 'reviews'];
  for (const dir of dirs) {
    const fullPath = resolve(docsDir, dir);
    mkdirSync(fullPath, { recursive: true });
    console.log(`  Created ${fullPath.replace(process.cwd(), '.')}/`);
  }
  console.log();
}

if (!existsSync(docsDir)) {
  const shouldInit = await promptInit();
  if (!shouldInit) {
    console.log('\n  Exiting. Create a docs/ directory or use --docs <path>.\n');
    process.exit(0);
  }
  createDocsStructure();
}

// ── Start server ───────────────────────────────────────────
const srcEntry = resolve(__dirname, '../src/server/index.ts');
const distEntry = resolve(__dirname, '../dist/server/index.js');

if (existsSync(srcEntry)) {
  // Development: use tsx to run TypeScript source directly
  const { spawn } = await import('child_process');
  const tsxPath = resolve(__dirname, '../node_modules/tsx/dist/esm/index.mjs');

  const child = spawn(
    process.execPath,
    ['--import', pathToFileURL(tsxPath).href, srcEntry],
    {
      stdio: 'inherit',
      env: { ...process.env, PORT: String(port), FORGE_DOCS: docsDir, FORGE_QUIET: '1' },
    }
  );

  // In dev mode, poll health endpoint before opening browser
  if (!noOpen) {
    const url = `http://localhost:${port}`;
    const waitForServer = async () => {
      for (let i = 0; i < 30; i++) {
        try {
          const res = await fetch(`${url}/api/health`);
          if (res.ok) return true;
        } catch { /* server not ready yet */ }
        await new Promise(r => setTimeout(r, 500));
      }
      return false;
    };
    waitForServer().then(async (ready) => {
      if (ready) {
        // Print branded output once server is confirmed ready
        try {
          const res = await fetch(`${url}/api/health`);
          const json = await res.json();
          const s = json.data.store;
          console.log(`  Reading artifacts from ${docsDir}`);
          console.log(`  Found: ${s.products} product(s), ${s.intentions} intention(s), ${s.expectations} expectation(s), ${s.specs} spec(s)\n`);
          console.log(`  ➜  ${url}\n`);
          console.log(`  Press Ctrl+C to stop\n`);
        } catch { /* ignore */ }
        const open = (await import('open')).default;
        await open(url);
      }
    });
  }

  child.on('exit', (code) => process.exit(code ?? 0));
} else if (existsSync(distEntry)) {
  // Production: suppress server output, print branded output ourselves
  process.env.FORGE_QUIET = '1';
  const { startServer } = await import(pathToFileURL(distEntry).href);
  const { url } = await startServer({ port, docsDir });

  // Print branded output
  try {
    const res = await fetch(`${url}/api/health`);
    const json = await res.json();
    const s = json.data.store;
    console.log(`  Reading artifacts from ${docsDir}`);
    console.log(`  Found: ${s.products} product(s), ${s.intentions} intention(s), ${s.expectations} expectation(s), ${s.specs} spec(s)\n`);
  } catch { /* ignore */ }
  console.log(`  ➜  ${url}\n`);
  console.log(`  Press Ctrl+C to stop\n`);

  if (!noOpen) {
    const open = (await import('open')).default;
    await open(url);
  }
} else {
  console.error(
    '  Error: Cannot find server entry point.\n  Run `npm run build` first or ensure src/ exists.\n'
  );
  process.exit(1);
}
```

- [ ] **Step 2: Delete old bin/forge.js**

```bash
git rm bin/forge.js
```

- [ ] **Step 3: Verify the CLI works in dev mode**

Run from the Forge repo root:
```bash
node bin/idd-forge.js --no-open
```
Expected: server starts, reads artifacts from ./docs, prints URL

Test help:
```bash
node bin/idd-forge.js --help
```
Expected: prints usage info

Test version:
```bash
node bin/idd-forge.js --version
```
Expected: prints `0.3.0`

- [ ] **Step 4: Test init prompt**

Run from a temp directory with no docs/:
```bash
cd /tmp && node /path/to/Forge/bin/idd-forge.js --no-open --docs ./test-docs
```
Expected: prompts to create directory structure, creates 5 subdirectories on Y

Clean up: `rm -rf /tmp/test-docs`

- [ ] **Step 5: Commit**

```bash
git add bin/idd-forge.js
git commit -m "feat: enhanced CLI entry point with arg parsing, init prompt, browser open

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Add README.md

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create README.md**

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with install and usage instructions

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Final Verification

- [ ] **Step 1: Run typecheck**

Run: `npm run typecheck`
Expected: passes

- [ ] **Step 2: Run unit tests**

Run: `npm test`
Expected: all pass (29/29)

- [ ] **Step 3: Test build**

Run: `npm run build`
Expected: Vite client build + tsc server build succeed

- [ ] **Step 4: Test production CLI**

After build, test the production path:
```bash
node bin/idd-forge.js --no-open
```
Expected: uses `dist/server/index.js`, starts server, prints URL

- [ ] **Step 5: Verify package contents**

Run: `npm pack --dry-run`
Expected: shows files that would be included — `bin/idd-forge.js`, `dist/` contents, `package.json`, `README.md`. Should NOT include `src/`, `e2e/`, `docs/`, test files.

- [ ] **Step 6: Commit if fixes needed**

```bash
git add -A
git commit -m "fix: address issues from CLI distribution verification

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```
