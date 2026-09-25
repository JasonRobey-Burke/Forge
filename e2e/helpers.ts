import { expect } from '@playwright/test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { stringify } from 'yaml';
const BASE_URL = 'http://127.0.0.1:4181/api';
type EntityType = 'products' | 'intentions' | 'expectations' | 'specs';
async function generatedRoot() {
  const marker = process.env.FORGE_E2E_STATE;
  if (!marker) throw new Error('Missing isolated workspace fixture marker');
  const { root } = JSON.parse(await fs.readFile(marker, 'utf8'));
  const real = await fs.realpath(root);
  if (path.dirname(real) !== await fs.realpath(os.tmpdir()) || !path.basename(real).startsWith('forge-workspace-e2e-')) throw new Error('Refusing non-generated fixture root');
  return real;
}
async function entityPath(type: EntityType, id: string) {
  if (!/^(PROD|INT|EXP|SPEC)-[a-f0-9]+$/.test(id)) throw new Error('Invalid fixture identity');
  const root = await generatedRoot();
  const directory = await fs.realpath(path.join(root, type));
  if (!directory.startsWith(root + path.sep)) throw new Error('Fixture directory escapes generated docs');
  const target = path.join(directory, `${id}.yaml`);
  try { if (!(await fs.realpath(target)).startsWith(root + path.sep)) throw new Error('Fixture file escapes generated docs'); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  return target;
}
export async function resetLegacyDocs() {
  const root = await generatedRoot();
  for (const type of ['products', 'intentions', 'expectations', 'specs'] as const) {
    const directory = await fs.realpath(path.join(root, type));
    if (!directory.startsWith(root + path.sep)) throw new Error('Fixture directory escapes generated docs');
    for (const entry of await fs.readdir(directory)) {
      if (!/^(PROD|INT|EXP|SPEC)-[a-f0-9]+\.yaml$/.test(entry)) throw new Error('Unexpected generated fixture file');
      await fs.unlink(await entityPath(type, entry.replace(/\.yaml$/, '')));
    }
  }
}
async function apiCall<T = any>(route: string, options: RequestInit = {}): Promise<T> {
  await generatedRoot(); // No request is allowed without a verified isolated launcher marker.
  const res = await fetch(BASE_URL + route, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error?.message || `HTTP ${res.status}`);
  return json.data;
}
export async function revision(type: EntityType, id: string) {
  await generatedRoot();
  const res = await fetch(`${BASE_URL}/${type}/${id}`);
  const json = await res.json();
  if (!res.ok || !/^"[a-f0-9]{64}"$/.test(json.meta?.source?.revision || '')) throw new Error('Missing source revision');
  return json.meta.source.revision as string;
}
async function createFixture(type: EntityType, data: Record<string, unknown>) {
  const prefix = { products: 'PROD', intentions: 'INT', expectations: 'EXP', specs: 'SPEC' }[type];
  const root = await generatedRoot();
  const existing = await fs.readdir(path.join(root, type));
  const next = Math.max(0, ...existing.map(name => Number(name.match(/-(\d+)\.yaml$/)?.[1] || 0))) + 1;
  const id = `${prefix}-${next}`;
  const record = { ...data, id };
  const text = stringify({ [type.slice(0, -1)]: record });
  await fs.writeFile(await entityPath(type, id), text, { flag: 'wx' });
  const checksum = `"${createHash('sha256').update(text).digest('hex')}"`;
  await expect.poll(async () => { try { return await revision(type, id); } catch { return null; } }).toBe(checksum);
  return { ...record, id };
}
export async function createProduct(overrides: Record<string, unknown> = {}) {
  return createFixture('products', { name: 'E2E product', problem_statement: 'Fixture problem', owner: 'Avery', status: 'active', ...overrides });
}
export async function createIntention(productId: string, overrides: Record<string, unknown> = {}) {
  return createFixture('intentions', { product: productId, statement: 'E2E intention purpose', rationale: 'Preserve work', status: 'defined', priority: 'medium', ...overrides });
}
export async function createExpectation(intentionId: string, overrides: Record<string, unknown> = {}) {
  return createFixture('expectations', { intention: intentionId, title: 'Expectation display title', description: 'E2E measurable outcome', status: 'ready', edge_cases: ['Edge case 1', 'Edge case 2'], ...overrides });
}
export async function createSpec(productId: string, overrides: Record<string, unknown> = {}) {
  const { validation_automated, validation_human, ...rest } = overrides;
  return createFixture('specs', { product: productId, title: 'E2E spec', description: 'E2E spec description', status: 'draft', expectations: [], context: { stack: [], patterns: [], conventions: [], auth: '' }, validation: { automated: validation_automated || [], human: validation_human || [] }, ...rest });
}
export async function deleteEntity(type: EntityType, id: string) { await fs.unlink(await entityPath(type, id)); }
export async function getProducts() { return apiCall<any[]>('/products'); }
export async function getSpecs(productId: string) { return apiCall<any[]>(`/specs?product_id=${encodeURIComponent(productId)}`); }
export async function updateSpec(specId: string, data: Record<string, unknown>) {
  return apiCall(`/specs/${specId}`, { method: 'PUT', headers: { 'If-Match': await revision('specs', specId) }, body: JSON.stringify(data) });
}
export async function linkExpectations(specId: string, expectationIds: string[]) {
  return apiCall(`/specs/${specId}/expectations`, { method: 'PUT', headers: { 'If-Match': await revision('specs', specId) }, body: JSON.stringify({ expectation_ids: expectationIds }) });
}
export async function transitionSpec(specId: string, toPhase: string, overrideReason?: string) {
  return apiCall(`/specs/${specId}/transition`, { method: 'POST', headers: { 'If-Match': await revision('specs', specId) }, body: JSON.stringify({ to_phase: toPhase, ...(overrideReason ? { override_reason: overrideReason } : {}) }) });
}
export async function reviewCreationDraft(page: import('@playwright/test').Page, kind: 'intention' | 'expectation') {
  const fields: Array<[RegExp, string]> = kind === 'intention'
    ? [[/^purpose$/i, 'New intentional outcome'], [/^rationale$/i, 'Reduce rework'], [/^owner$/i, 'Avery']]
    : [[/measurable outcome/i, 'New measurable result'], [/validation criteria/i, 'Inspect representative outcomes'], [/edge case 1/i, 'First edge case'], [/edge case 2/i, 'Second edge case'], [/^owner$/i, 'Avery']];
  const filled = new Set<number>(); let selected = false, confirmed = kind === 'intention';
  for (let step = 0; step < 6; step++) {
    for (const [index, [name, value]] of fields.entries()) {
      const field = page.getByRole('textbox', { name });
      if (!filled.has(index) && await field.isVisible()) { await field.fill(value); filled.add(index); }
    }
    const select = page.getByRole('combobox', { name: kind === 'intention' ? /priority/i : /complexity/i });
    if (!selected && await select.isVisible()) {
      if (await select.evaluate(element => element.tagName) === 'SELECT') await select.selectOption('medium');
      else { await select.click(); await page.getByRole('option', { name: 'Medium', exact: true }).click(); }
      selected = true;
    }
    const confirm = page.getByRole('checkbox', { name: /I confirm these edge cases/i });
    if (!confirmed && await confirm.isVisible()) { await confirm.check(); confirmed = true; }
    const review = page.getByRole('button', { name: /review draft/i });
    if (filled.size === fields.length && selected && confirmed && await review.isVisible()) { await review.click(); return; }
    await page.getByRole('button', { name: /^next$/i }).click();
  }
  throw new Error('Creation wizard did not expose its declared fields');
}
