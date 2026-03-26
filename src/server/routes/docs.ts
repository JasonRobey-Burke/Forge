import { Router } from 'express';
import fs from 'fs';
import path from 'path';

export default function docsRouter(docsDir: string): Router {
  const router = Router();

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
