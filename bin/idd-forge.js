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
