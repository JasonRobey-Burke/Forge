import { watch, type FSWatcher } from 'chokidar';
import path from 'path';
import type { YamlStore } from './yamlStore.js';

let watcher: FSWatcher | null = null;

export function startFileWatcher(
  docsDir: string,
  store: YamlStore,
  onFileChange?: (event: string, filePath: string) => void
): void {
  watcher = watch(docsDir, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
    ignored: (filePath, stats) => {
      if (!stats?.isFile()) return false;
      const ext = path.extname(filePath).toLowerCase();
      return ext !== '.yaml' && ext !== '.yml' && ext !== '.md';
    },
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
