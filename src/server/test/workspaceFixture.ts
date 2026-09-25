import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import express from 'express';
import { initStore } from '../lib/yamlStore.js';
import products from '../routes/products.js';
import intentions from '../routes/intentions.js';
import expectations from '../routes/expectations.js';
import specs from '../routes/specs.js';
import docsRouter from '../routes/docs.js';
import { errorHandler } from '../middleware/errorHandler.js';

export const baseFiles = {
  'products/PROD-1.yaml': 'product:\n  id: PROD-1\n  name: Demo\n  wip_limits: { draft: 0, ready: 0, in_progress: 0, review: 1, validating: 0 }\n',
  'products/PROD-2.yaml': 'product:\n  id: PROD-2\n  name: Other\n',
  'intentions/INT-1.yaml': 'intention:\n  id: INT-1\n  product: PROD-1\n  statement: One\n  rationale: Useful\n',
  'intentions/INT-2.yaml': 'intention:\n  id: INT-2\n  product: PROD-1\n  statement: Two\n  rationale: Useful\n',
  'intentions/INT-3.yaml': 'intention:\n  id: INT-3\n  product: PROD-2\n  statement: Other\n',
  'expectations/EXP-1.yaml': 'expectation:\n  id: EXP-1\n  intention: INT-1\n  description: A result\n  edge_cases: [One, Two]\n  validation_criteria: Verified\n',
  'expectations/EXP-2.yaml': 'expectation:\n  id: EXP-2\n  intention: INT-3\n  description: Other result\n  edge_cases: [One, Two]\n',
  'specs/SPEC-1.yaml': 'spec:\n  id: SPEC-1\n  product: PROD-1\n  title: First\n  status: draft\n  expectations: [EXP-1]\n  context: { stack: [], patterns: [], conventions: [], auth: "" }\n  validation: {}\n',
};

export async function workspaceFixture(files: Record<string, string> = baseFiles) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-write-contract-'));
  for (const sub of ['products', 'intentions', 'expectations', 'specs']) fs.mkdirSync(path.join(root, sub));
  const write = (relative: string, text: string) => fs.writeFileSync(path.join(root, relative), text);
  for (const [relative, text] of Object.entries(files)) write(relative, text);
  const store = await initStore(root);
  const read = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');
  const revision = (relative: string) => `"${createHash('sha256').update(read(relative)).digest('hex')}"`;
  const app = express();
  app.use(express.json());
  app.use('/api/products', products);
  app.use('/api/intentions', intentions);
  app.use('/api/expectations', expectations);
  app.use('/api/specs', specs);
  app.use('/api/docs', docsRouter(root));
  app.use(errorHandler);
  return { root, store, app, read, write, revision, dispose: () => fs.rmSync(root, { recursive: true, force: true }) };
}
