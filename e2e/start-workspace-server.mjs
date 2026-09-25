import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
const marker = process.env.FORGE_E2E_STATE;
if (!marker) throw new Error('FORGE_E2E_STATE is required');
const root = await mkdtemp(path.join(os.tmpdir(), 'forge-workspace-e2e-'));
for (const dir of ['products', 'intentions', 'expectations', 'specs']) await mkdir(path.join(root, dir));
await writeFile(marker, JSON.stringify({ root }));
const child = spawn(process.execPath, ['dist/server/index.js'], { stdio: 'inherit', env: { ...process.env, PORT: '4181', FORGE_DOCS: root, FORGE_QUIET: '1' } });
let finished = false;
async function cleanup(code = 0) {
  if (finished) return;
  finished = true;
  await rm(root, { recursive: true, force: true });
  await rm(marker, { force: true });
  process.exit(code);
}
process.on('SIGTERM', () => child.kill('SIGTERM'));
process.on('SIGINT', () => child.kill('SIGINT'));
child.on('error', error => { console.error(error); void cleanup(1); });
child.on('exit', code => { void cleanup(code ?? 0); });
