import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { errorHandler } from './middleware/errorHandler.js';
import { initStore, getStore } from './lib/yamlStore.js';
import { startFileWatcher } from './lib/fileWatcher.js';
import productRouter from './routes/products.js';
import intentionRouter from './routes/intentions.js';
import expectationRouter from './routes/expectations.js';
import specRouter from './routes/specs.js';
import docsRouter from './routes/docs.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface ServerOptions {
  port?: number;
  docsDir?: string;
}

export async function startServer(options: ServerOptions = {}) {
  const port = options.port ?? parseInt(process.env.PORT ?? '4000');
  const docsDir = path.resolve(options.docsDir ?? process.env.FORGE_DOCS ?? './docs');

  const quiet = process.env.FORGE_QUIET === '1';

  // Initialize YAML store
  const store = await initStore(docsDir);
  const stats = store.getStats();
  if (!quiet) {
    console.log(`Forge reading artifacts from ${docsDir}`);
    console.log(`Found: ${stats.products} product(s), ${stats.intentions} intention(s), ${stats.expectations} expectation(s), ${stats.specs} spec(s)`);
  }

  const app = express();
  app.use(express.json());

  // Health check
  app.get('/api/health', (_req, res) => {
    const s = getStore().getStats();
    res.json({
      data: { status: 'ok', timestamp: new Date().toISOString(), store: s },
      error: null,
      meta: null,
    });
  });

  // SSE endpoint for file watcher events
  const sseClients = new Set<import('express').Response>();
  app.get('/api/events', (_req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    sseClients.add(res);
    _req.on('close', () => sseClients.delete(res));
  });

  // Export SSE broadcast for file watcher
  (app as any).broadcastSSE = (event: string, data: unknown) => {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of sseClients) {
      client.write(message);
    }
  };

  // Start file watcher for live refresh
  startFileWatcher(docsDir, store, (event, filePath) => {
    const message = `event: file-change\ndata: ${JSON.stringify({ event, file: filePath })}\n\n`;
    for (const client of sseClients) {
      client.write(message);
    }
  });

  // API routes (no auth middleware — local dev tool)
  app.use('/api/products', productRouter);
  app.use('/api/intentions', intentionRouter);
  app.use('/api/expectations', expectationRouter);
  app.use('/api/specs', specRouter);
  app.use('/api/docs', docsRouter(docsDir));

  app.use(errorHandler);

  // Serve built client in production
  const clientDir = path.join(__dirname, '../../dist/client');
  app.use(express.static(clientDir));
  app.get('{*path}', (_req, res) => {
    res.sendFile('index.html', { root: clientDir }, (err) => {
      if (err) res.status(404).send('Not found — run npm run build first');
    });
  });

  return new Promise<{ app: typeof app; url: string }>((resolve) => {
    app.listen(port, () => {
      const url = `http://localhost:${port}`;
      if (!quiet) console.log(`Forge running at ${url}`);
      resolve({ app, url });
    });
  });
}

// Auto-start when run directly (not imported)
const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('index.ts') ||
  process.argv[1].endsWith('index.js')
);
if (isDirectRun) {
  await startServer();
}
