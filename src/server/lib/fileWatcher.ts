import { watch, type FSWatcher } from 'chokidar';
import path from 'path';
import { readArtifact } from './artifactFiles.js';
import type { YamlStore } from './yamlStore.js';

interface WatchSession {
  watcher: FSWatcher;
  stopped: boolean;
  timer?: ReturnType<typeof setTimeout>;
  fallback?: ReturnType<typeof setInterval>;
  running?: Promise<void>;
  finishStart: () => void;
}
let session: WatchSession | undefined;

export async function startFileWatcher(
  docsDir: string,
  store: YamlStore,
  onFileChange?: (event: string, filePath: string) => void
): Promise<void> {
  await stopFileWatcher();
  const watcher = watch(docsDir, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
    ignored: (filePath, stats) => {
      if (path.basename(filePath).startsWith('.forge-')) return true;
      if (!stats?.isFile()) return false;
      const ext = path.extname(filePath).toLowerCase();
      return ext !== '.yaml' && ext !== '.yml' && ext !== '.md';
    },
  });
  let finishStart!: () => void;
  let failStart!: (error: unknown) => void;
  const starting = new Promise<void>((resolve,reject)=>{finishStart=resolve;failStart=reject;});
  const current: WatchSession = {watcher,stopped:false,finishStart};
  session = current;
  const observed = new Map<string,string>();
  const markdown = new Map<string,string>();
  const pendingMarkdown = new Map<string,string>();
  let ready = false;
  let requested = false;
  const notify = (event:string,filePath:string) => { if (!current.stopped) onFileChange?.(event,filePath); };
  function reconcile(): Promise<void> {
    requested = true;
    if (current.running) return current.running;
    current.running = (async()=>{
      while (requested && !current.stopped) {
        requested = false;
        const changes = await store.reconcileFiles(observed);
        if (current.stopped) return;
        for (const change of changes) notify(change.event,change.filePath);
        for (const [filePath,event] of pendingMarkdown) {
          pendingMarkdown.delete(filePath);
          if (event === 'unlink') { markdown.delete(filePath); notify(event,filePath); continue; }
          try {
            const text = readArtifact(docsDir,path.relative(docsDir,filePath)).text;
            if (markdown.get(filePath) !== text) { markdown.set(filePath,text); notify(event,filePath); }
          } catch { /* A subsequent native event reports a removed or unreadable document. */ }
        }
      }
    })().finally(()=>{current.running=undefined;});
    return current.running;
  }
  function schedule() {
    if (!ready || current.stopped || current.timer) return;
    // Coalesce a burst without postponing it indefinitely as more events arrive.
    current.timer = setTimeout(()=>{
      current.timer=undefined;
      void reconcile().catch(error=>console.error('Could not refresh artifacts',error));
    },100);
  }
  for (const event of ['add','change','unlink'] as const) {
    watcher.on(event,(filePath:string)=>{
      if (current.stopped) return;
      if (path.extname(filePath).toLowerCase() === '.md') pendingMarkdown.set(filePath,event);
      schedule();
    });
  }
  watcher.once('ready',()=>{
    if (current.stopped) return;
    ready = true;
    // Native events are hints, not a complete inventory. Read bytes on the fallback,
    // but only parse and notify changed sources, under the repository mutation queue.
    current.fallback = setInterval(schedule,4000);
    void reconcile().then(finishStart,failStart);
  });
  watcher.on('error',error=>{
    if (!ready) failStart(error);
    else console.error('Could not watch artifacts',error);
  });
  try { await starting; }
  catch (error) { if (session === current) await stopFileWatcher(); throw error; }
}

export async function stopFileWatcher(): Promise<void> {
  const current = session;
  if (!current) return;
  session = undefined;
  current.stopped = true;
  clearTimeout(current.timer);
  clearInterval(current.fallback);
  current.finishStart();
  await current.watcher.close();
  await current.running;
}
