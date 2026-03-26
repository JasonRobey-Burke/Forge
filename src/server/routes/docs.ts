import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { getStore } from '../lib/yamlStore.js';

const VALID_TYPES = ['products', 'intentions', 'expectations', 'specs'];

export default function docsRouter(docsDir: string): Router {
  const router = Router();

  // GET /api/docs/raw/:type/:id — return raw YAML file content
  router.get('/raw/:type/:id', async (req, res) => {
    const { type, id } = req.params;
    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({
        data: null,
        error: { message: `Invalid type: ${type}`, code: 'INVALID_TYPE' },
        meta: null,
      });
    }
    const content = getStore().getRawFileContent(type, id);
    if (content === null) {
      return res.status(404).json({
        data: null,
        error: { message: 'Not found', code: 'NOT_FOUND' },
        meta: null,
      });
    }
    res.json({ data: { id, type, content }, error: null, meta: null });
  });

  // PUT /api/docs/raw/:type/:id — save raw YAML file content
  router.put('/raw/:type/:id', async (req, res) => {
    const { type, id } = req.params;
    const { content } = req.body;
    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({
        data: null,
        error: { message: `Invalid type: ${type}`, code: 'INVALID_TYPE' },
        meta: null,
      });
    }
    if (typeof content !== 'string') {
      return res.status(400).json({
        data: null,
        error: { message: 'content must be a string', code: 'INVALID_BODY' },
        meta: null,
      });
    }
    const saved = getStore().saveRawFileContent(type, id, content);
    if (!saved) {
      return res.status(404).json({
        data: null,
        error: { message: 'Not found', code: 'NOT_FOUND' },
        meta: null,
      });
    }
    res.json({ data: { id, type, saved: true }, error: null, meta: null });
  });

  // GET /api/docs/plans — list plan markdown files
  router.get('/plans', async (_req, res) => {
    const plansDir = path.join(docsDir, 'superpowers', 'plans');
    try {
      const files = await fs.promises.readdir(plansDir);
      const mdFiles = files.filter((f) => f.endsWith('.md'));
      const data = await Promise.all(
        mdFiles.map(async (f) => {
          const stat = await fs.promises.stat(path.join(plansDir, f));
          return { name: f.replace(/\.md$/, ''), size: stat.size };
        })
      );
      res.json({ data, error: null, meta: { count: data.length } });
    } catch {
      res.json({ data: [], error: null, meta: { count: 0 } });
    }
  });

  // GET /api/docs/plans/:name — return a single plan's markdown content
  router.get('/plans/:name', async (req, res) => {
    const name = decodeURIComponent(req.params.name);
    const filePath = path.join(docsDir, 'superpowers', 'plans', `${name}.md`);
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      res.json({ data: { name, content }, error: null, meta: null });
    } catch {
      res.status(404).json({
        data: null,
        error: { message: 'Not found', code: 'NOT_FOUND' },
        meta: null,
      });
    }
  });

  // GET /api/docs/reviews — list review markdown files
  router.get('/reviews', async (_req, res) => {
    const reviewsDir = path.join(docsDir, 'reviews');
    try {
      const files = await fs.promises.readdir(reviewsDir);
      const mdFiles = files.filter((f) => f.endsWith('.md'));
      const data = await Promise.all(
        mdFiles.map(async (f) => {
          const stat = await fs.promises.stat(path.join(reviewsDir, f));
          return { name: f.replace(/\.md$/, ''), size: stat.size };
        })
      );
      res.json({ data, error: null, meta: { count: data.length } });
    } catch {
      res.json({ data: [], error: null, meta: { count: 0 } });
    }
  });

  // GET /api/docs/reviews/:name — return a single review's markdown content
  router.get('/reviews/:name', async (req, res) => {
    const name = decodeURIComponent(req.params.name);
    const filePath = path.join(docsDir, 'reviews', `${name}.md`);
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      res.json({ data: { name, content }, error: null, meta: null });
    } catch {
      res.status(404).json({
        data: null,
        error: { message: 'Not found', code: 'NOT_FOUND' },
        meta: null,
      });
    }
  });

  return router;
}
