import { watch, type FSWatcher } from 'chokidar';
import path from 'path';
import type { YamlStore } from './yamlStore.js';

let watcher: FSWatcher | null = null;

export function startFileWatcher(
  docsDir: string,
  store: YamlStore,
  onFileChange?: (event: string, filePath: string) => void
): void {
  const watchPath = path.join(docsDir, '**/*.{yaml,yml}');

  watcher = watch(watchPath, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
  });

  watcher.on('add', (filePath: string) => {
    store.reloadFile(filePath);
    onFileChange?.('add', filePath);
  });

  watcher.on('change', (filePath: string) => {
    store.reloadFile(filePath);
    onFileChange?.('change', filePath);
  });

  watcher.on('unlink', (filePath: string) => {
    store.removeFile(filePath);
    onFileChange?.('unlink', filePath);
  });
}

export async function stopFileWatcher(): Promise<void> {
  if (watcher) {
    await watcher.close();
    watcher = null;
  }
}
