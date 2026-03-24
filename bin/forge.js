#!/usr/bin/env node

import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distEntry = resolve(__dirname, '../dist/server/index.js');
const srcEntry = resolve(__dirname, '../src/server/index.ts');

const port = parseInt(process.env.PORT ?? '4000');
const docsDir = process.env.FORGE_DOCS ?? './docs';

if (existsSync(distEntry)) {
  // Production: run compiled output
  const { startServer } = await import(pathToFileURL(distEntry).href);
  startServer({ port, docsDir });
} else if (existsSync(srcEntry)) {
  // Development: use tsx to run TypeScript source directly
  const { spawn } = await import('child_process');
  const tsxBin = resolve(__dirname, '../node_modules/.bin/tsx');

  const child = spawn(
    process.execPath,
    ['--import', 'tsx', srcEntry],
    { stdio: 'inherit', env: { ...process.env, PORT: String(port), FORGE_DOCS: docsDir } }
  );
  child.on('exit', (code) => process.exit(code ?? 0));
} else {
  console.error('Forge: cannot find server entry point. Run `npm run build` first or ensure src/ exists.');
  process.exit(1);
}
