import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { getStore } from '../lib/yamlStore.js';
import { computePipelineMetrics, countSpecGaps, specIdFromExecutionReport, type PhaseHistoryLike } from '../../shared/lib/pipelineMetrics.js';

export default function metricsRouter(docsDir: string): Router {
  const router = Router();

  // GET /api/metrics?product_id=xxx — pipeline metrics computed read-only
  // from gap_check annotations, execution reports, and phase history.
  router.get('/', async (req, res) => {
    const productId = req.query.product_id as string;
    if (!productId) {
      return res.status(400).json({
        data: null,
        error: { message: 'product_id query parameter is required', code: 'VALIDATION_ERROR' },
        meta: null,
      });
    }

    const store = getStore();
    const specs = store.listSpecs(productId);

    const histories = new Map<string, PhaseHistoryLike[]>();
    for (const spec of specs) {
      histories.set(spec.id, store.getPhaseHistory(spec.id));
    }

    // Sum spec_gaps_encountered entries across each spec's execution reports
    const executionGaps = new Map<string, number>();
    const reviewsDir = path.join(docsDir, 'reviews');
    try {
      const files = await fs.promises.readdir(reviewsDir);
      for (const file of files) {
        const specId = specIdFromExecutionReport(file);
        if (!specId || !specs.some((s) => s.id === specId)) continue;
        try {
          const content = await fs.promises.readFile(path.join(reviewsDir, file), 'utf-8');
          const gaps = countSpecGaps(content);
          if (gaps !== null) {
            executionGaps.set(specId, (executionGaps.get(specId) ?? 0) + gaps);
          }
        } catch {
          // unreadable report: skip rather than fail the whole endpoint
        }
      }
    } catch {
      // no reviews directory — execution-gap column stays empty
    }

    const metrics = computePipelineMetrics(specs, histories, executionGaps);
    res.json({ data: metrics, error: null, meta: { spec_count: specs.length } });
  });

  return router;
}
