#!/usr/bin/env node

import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcEntry = resolve(__dirname, '../src/server/index.ts');
const distEntry = resolve(__dirname, '../dist/server/index.js');

const port = parseInt(process.env.PORT ?? '4000');
// Resolve docsDir relative to where the user runs the command, not where Forge is installed
const docsDir = resolve(process.cwd(), process.env.FORGE_DOCS ?? './docs');

if (existsSync(srcEntry)) {
  // Development / npm link: use tsx to run TypeScript source directly
  const { spawn } = await import('child_process');
  // Resolve tsx from Forge's own node_modules, not the user's project
  const tsxPath = resolve(__dirname, '../node_modules/tsx/dist/esm/index.mjs');

  const child = spawn(
    process.execPath,
    ['--import', pathToFileURL(tsxPath).href, srcEntry],
    { stdio: 'inherit', env: { ...process.env, PORT: String(port), FORGE_DOCS: docsDir } }
  );
  child.on('exit', (code) => process.exit(code ?? 0));
} else if (existsSync(distEntry)) {
  // Production: run compiled output (src/ stripped in published package)
  const { startServer } = await import(pathToFileURL(distEntry).href);
  startServer({ port, docsDir });
} else {
  console.error('Forge: cannot find server entry point. Run `npm run build` first or ensure src/ exists.');
  process.exit(1);
}
