import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { YamlStore } from './yamlStore.js';
import { setRecoveryPaths } from './artifactFiles.js';
import { startFileWatcher, stopFileWatcher } from './fileWatcher.js';

const native = vi.hoisted(() => ({ watch: vi.fn() }));
vi.mock('chokidar', () => ({ default: { watch: native.watch }, watch: native.watch }));

// Native events are deliberately absent: these tests witness the public
// reconciliation contract when the operating system drops notifications.
const reconciliationDeadline = 6_500;
const fullReconciliationWindow = 5_500;
const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const specText = (id: string, title: string) =>
  `# Preserve existing source formatting\nspec:\n  id: ${id}\n  product: PROD-1\n  title: ${title}\n  status: draft\n`;

describe('external artifact reconciliation', () => {
  let sandbox: string;
  let root: string;
  let store: YamlStore;
  let watcher: EventEmitter & { close: ReturnType<typeof vi.fn> };
  let notify: ReturnType<typeof vi.fn>;
  const relative = (id: string) => `specs/${id}.yaml`;
  const file = (id: string) => path.join(root, relative(id));
  const write = (id: string, title: string) => fs.writeFileSync(file(id), specText(id, title));

  beforeEach(async () => {
    sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-watcher-contract-'));
    root = path.join(sandbox, 'docs');
    for (const dir of ['products', 'intentions', 'expectations', 'specs']) {
      fs.mkdirSync(path.join(root, dir), { recursive: true });
    }
    write('SPEC-1', 'Original');
    store = new YamlStore(root);
    await store.init();
    watcher = Object.assign(new EventEmitter(), { close: vi.fn(async () => undefined) });
    native.watch.mockReset().mockReturnValue(watcher);
    notify = vi.fn();
  });

  afterEach(async () => {
    await stopFileWatcher();
    setRecoveryPaths(root, []);
    fs.rmSync(sandbox, { recursive: true, force: true });
  });

  async function ready() {
    const starting = startFileWatcher(root, store, notify);
    await vi.waitFor(() => expect(native.watch).toHaveBeenCalled());
    watcher.emit('ready');
    await starting;
  }

  it('waits for native readiness and reconciles files created during initialization', async () => {
    let resolved = false;
    const starting = startFileWatcher(root, store, notify).then(() => { resolved = true; });
    await vi.waitFor(() => expect(native.watch).toHaveBeenCalled());
    write('SPEC-DURING-START', 'Created during startup');
    await pause(30);
    const resolvedBeforeReady = resolved;
    watcher.emit('ready');
    await starting;

    expect.soft(resolvedBeforeReady).toBe(false);
    expect(store.getSpec('SPEC-DURING-START')?.title).toBe('Created during startup');
    expect(store.getStats().specs).toBe(2);
  });

  it('publishes external additions, edits and deletions with no individual native event', async () => {
    await ready();
    notify.mockClear();
    write('SPEC-NEW', 'Added externally');
    await expect.poll(() => store.getSpec('SPEC-NEW')?.title, { timeout: reconciliationDeadline }).toBe('Added externally');
    expect(notify).toHaveBeenCalled();

    notify.mockClear();
    write('SPEC-1', 'Edited externally');
    await expect.poll(() => store.getSpec('SPEC-1')?.title, { timeout: reconciliationDeadline }).toBe('Edited externally');
    expect(notify).toHaveBeenCalled();

    notify.mockClear();
    fs.unlinkSync(file('SPEC-NEW'));
    await expect.poll(() => store.getSpec('SPEC-NEW'), { timeout: reconciliationDeadline }).toBeNull();
    expect(store.getStats().specs).toBe(1);
    expect(notify).toHaveBeenCalled();
  }, 25_000);

  it('leaves unchanged legacy sources and notifications untouched across periodic checks', async () => {
    const before = fs.statSync(file('SPEC-1'));
    const bytes = fs.readFileSync(file('SPEC-1'));
    await ready();
    notify.mockClear();
    await pause(fullReconciliationWindow * 2);

    expect(fs.readFileSync(file('SPEC-1'))).toEqual(bytes);
    expect(fs.statSync(file('SPEC-1')).mtimeMs).toBe(before.mtimeMs);
    expect(store.getSpec('SPEC-1')?.title).toBe('Original');
    expect(notify).not.toHaveBeenCalled();
  }, 15_000);

  it('retains recovery-protected changed and deleted artifacts while reconciling unrelated files', async () => {
    write('SPEC-PROTECTED-DELETE', 'Retained');
    await store.init();
    await ready();
    setRecoveryPaths(root, [relative('SPEC-1'), relative('SPEC-PROTECTED-DELETE')]);
    write('SPEC-1', 'Partial recovery write');
    fs.unlinkSync(file('SPEC-PROTECTED-DELETE'));
    write('SPEC-UNRELATED', 'Independent change');

    await expect.poll(() => store.getSpec('SPEC-UNRELATED')?.title, { timeout: reconciliationDeadline }).toBe('Independent change');
    expect(store.getSpec('SPEC-1')?.title).toBe('Original');
    expect(store.getSpec('SPEC-PROTECTED-DELETE')?.title).toBe('Retained');
    expect(store.getStats().specs).toBe(3);

    setRecoveryPaths(root, []);
    await expect.poll(() => ({
      changed: store.getSpec('SPEC-1')?.title,
      deleted: store.getSpec('SPEC-PROTECTED-DELETE'),
      count: store.getStats().specs,
    }), { timeout: reconciliationDeadline }).toEqual({ changed: 'Partial recovery write', deleted: null, count: 2 });
  }, 20_000);

  it('closes the native watcher and stops reconciliation and notifications', async () => {
    await ready();
    await stopFileWatcher();
    expect(watcher.close).toHaveBeenCalledTimes(1);
    notify.mockClear();
    write('SPEC-1', 'After stop');
    write('SPEC-AFTER-STOP', 'After stop');
    await pause(fullReconciliationWindow);

    expect(store.getSpec('SPEC-1')?.title).toBe('Original');
    expect(store.getSpec('SPEC-AFTER-STOP')).toBeNull();
    expect(notify).not.toHaveBeenCalled();
  }, 10_000);

  it('does not index or alter artifacts reached through symlinks outside the docs root', async () => {
    await ready();
    const outside = path.join(sandbox, 'outside.yaml');
    const bytes = specText('SPEC-ESCAPE', 'Outside root');
    fs.writeFileSync(outside, bytes);
    fs.symlinkSync(outside, file('SPEC-ESCAPE'));
    write('SPEC-SAFE', 'Inside root');

    await expect.poll(() => store.getSpec('SPEC-SAFE')?.title, { timeout: reconciliationDeadline }).toBe('Inside root');
    expect(store.getSpec('SPEC-ESCAPE')).toBeNull();
    expect(store.getStats().specs).toBe(2);
    expect(fs.readFileSync(outside, 'utf8')).toBe(bytes);
  }, 10_000);
});
