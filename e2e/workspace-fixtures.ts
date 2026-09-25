import { test as base, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
type Fixtures = { seedWorkspace: () => Promise<void>; docsRoot: string; seed: (files: Record<string, string>) => Promise<void>; read: (relative: string) => Promise<string>; write: (relative: string, text: string) => Promise<void> };
async function safePath(root: string, relative: string) {
  const target = path.resolve(root, relative);
  const contained = (candidate: string) => candidate !== root && candidate.startsWith(root + path.sep);
  if (!contained(target)) throw new Error('Fixture path must stay inside generated docs');
  let ancestor = target;
  for (;;) {
    try { if (!contained(await fs.realpath(ancestor)) && await fs.realpath(ancestor) !== root) throw new Error('Fixture symlink escapes docs'); break; }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; ancestor = path.dirname(ancestor); }
  }
  return target;
}
const workspaceFiles = {
  'products/PROD-1.yaml': 'product:\n  id: PROD-1\n  name: Workspace test product\n  problem_statement: Preserve human work\n  owner: Avery\n  status: active\n',
  'intentions/INT-1.yaml': 'intention:\n  id: INT-1\n  product: PROD-1\n  statement: Reliable edits\n  rationale: Preserve human work\n  priority: high\n  status: defined\n  forge:\n    roadmap: { bucket: now, rank: 1 }\n',
  'expectations/EXP-1.yaml': 'expectation:\n  id: EXP-1\n  intention: INT-1\n  description: Original measurable outcome\n  status: ready\n  edge_cases: [Offline, External change]\n',
};
export const test = base.extend<Fixtures>({
  seedWorkspace: async ({ seed }, use) => { await use(() => seed(workspaceFiles)); },
  docsRoot: async ({}, use) => {
    const marker = process.env.FORGE_E2E_STATE;
    if (!marker) throw new Error('Missing workspace fixture marker');
    const { root } = JSON.parse(await fs.readFile(marker, 'utf8')) as { root: string };
    const real = await fs.realpath(root);
    if (path.dirname(real) !== await fs.realpath(os.tmpdir()) || !path.basename(real).startsWith('forge-workspace-e2e-')) throw new Error('Refusing non-generated fixture root');
    await use(real);
  },
  read: async ({ docsRoot }, use) => { await use(async relative => fs.readFile(await safePath(docsRoot, relative), 'utf8')); },
  write: async ({ docsRoot }, use) => { await use(async (relative, text) => { const target = await safePath(docsRoot, relative); await fs.mkdir(path.dirname(target), { recursive: true }); await fs.writeFile(target, text); }); },
  seed: async ({ docsRoot, write, request }, use) => {
    await use(async files => {
      for (const dir of ['products', 'intentions', 'expectations', 'specs']) {
        const target = await safePath(docsRoot, dir);
        for (const entry of await fs.readdir(target)) {
          await fs.rm(await safePath(docsRoot, path.join(dir, entry)), { force: true, recursive: true });
        }
      }
      for (const [relative, text] of Object.entries(files)) await write(relative, text);
      await expect.poll(async () => {
        const response = await request.get('/api/health');
        return (await response.json()).data?.status;
      }).toBe('ok');
      for (const [relative, text] of Object.entries(files)) {
        const [type, filename] = relative.split('/');
        const id = filename.replace(/\.yaml$/, '');
        const revision = `"${createHash('sha256').update(text).digest('hex')}"`;
        await expect.poll(async () => {
          const response = await request.get(`/api/${type}/${id}`);
          if (!response.ok()) return null;
          return (await response.json()).meta?.source?.revision;
        }).toBe(revision);
      }
      await expect.poll(async () => (await request.get('/api/products/PROD-1/workspace')).status()).toBe(200);
    });
  },
});
export { expect };
