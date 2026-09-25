import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { allocateArtifactId } from './artifactIds.js';
vi.mock('node:crypto', async importOriginal => {
  const actual = await importOriginal<typeof import('node:crypto')>();
  const randomBytes = vi.fn();
  return { ...actual, randomBytes, default: { ...actual.default, randomBytes } };
});
let root: string;
beforeEach(() => { vi.mocked(crypto.randomBytes).mockReset(); root = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-ids-')); for (const type of ['intentions', 'expectations']) fs.mkdirSync(path.join(root, type)); });
afterEach(() => { vi.restoreAllMocks(); fs.rmSync(root, { recursive: true, force: true }); });
function put(name: string, id: string) { fs.writeFileSync(path.join(root, 'intentions', name), `intention:\n  id: ${id}\n  product: PROD-1\n  statement: Existing\n`); }
function random(values: string[]) { return vi.mocked(crypto.randomBytes).mockImplementation((() => Buffer.from(values.shift()!, 'hex')) as typeof crypto.randomBytes); }
describe('fresh exclusive artifact identities', () => {
  it.each([['intentions', 'INT'], ['expectations', 'EXP']] as const)('allocates canonical %s IDs', async (type, prefix) => { random(['abcd']); expect(await allocateArtifactId(root, type)).toBe(`${prefix}-abcd`); });
  it('checks both internal IDs and slugged filename prefixes from a fresh scan', async () => {
    random(['aaaa', 'aaaa', 'bbbb', 'cccc']);
    expect(await allocateArtifactId(root, 'intentions')).toBe('INT-aaaa');
    put('INT-bbbb-existing.yaml', 'INT-aaaa');
    expect(await allocateArtifactId(root, 'intentions')).toBe('INT-cccc');
    expect(fs.readdirSync(path.join(root, 'intentions'))).toEqual(['INT-bbbb-existing.yaml']);
  });
  it('extends hex width after five collisions at each width', async () => {
    put('INT-aaaa.yaml', 'INT-aaaa'); put('INT-bbbbbb.yaml', 'INT-bbbbbb');
    const stub = random([...Array(5).fill('aaaa'), ...Array(5).fill('bbbbbb'), 'cccccccc']);
    expect(await allocateArtifactId(root, 'intentions')).toBe('INT-cccccccc');
    expect(stub.mock.calls.map(args => args[0])).toEqual([...Array(5).fill(2), ...Array(5).fill(3), 4]);
  });
  it.each(['malformed', 'duplicate'])('blocks an ambiguous %s namespace with an actionable diagnostic', async kind => {
    put('INT-aaaa.yaml', 'INT-aaaa');
    if (kind === 'duplicate') put('INT-bbbb.yaml', 'INT-aaaa');
    else fs.writeFileSync(path.join(root, 'intentions/INT-bbbb.yaml'), 'intention: [unterminated');
    await expect(allocateArtifactId(root, 'intentions')).rejects.toMatchObject({ code: expect.any(String), message: expect.stringMatching(/malformed|invalid|parse|duplicate|ambiguous/i) });
  });
});
