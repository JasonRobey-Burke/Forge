import { Router, type Request } from 'express';
import { validate } from '../middleware/validate.js';
import { updateSpecSchema } from '../../shared/schemas/spec.js';
import { transitionSpecSchema } from '../../shared/schemas/transition.js';
import * as specService from '../services/spec.js';
import * as transitionService from '../services/phaseTransition.js';

const router = Router();

// GET /api/specs?product_id=xxx
router.get('/', async (req, res) => {
  const productId = req.query.product_id as string;
  if (!productId) {
    return res.status(400).json({
      data: null,
      error: { message: 'product_id query parameter is required', code: 'VALIDATION_ERROR' },
      meta: null,
    });
  }
  const specs = await specService.listSpecs(productId);
  res.json({ data: specs, error: null, meta: { count: specs.length } });
});

// GET /api/specs/staleness?product_id=xxx
// MUST be registered before /:id routes to avoid "staleness" being captured as an ID
router.get('/staleness', async (req, res) => {
  const productId = req.query.product_id as string;
  if (!productId) {
    return res.status(400).json({
      data: null,
      error: { message: 'product_id query parameter is required', code: 'VALIDATION_ERROR' },
      meta: null,
    });
  }
  const staleIds = await specService.getStaleSpecIds(productId);
  res.json({ data: staleIds, error: null, meta: null });
});

// GET /api/specs/:id
router.get('/:id', async (req: Request<{ id: string }>, res) => {
  const spec = await specService.getSpec(req.params.id);
  if (!spec) {
    return res.status(404).json({
      data: null,
      error: { message: 'Spec not found', code: 'NOT_FOUND' },
      meta: null,
    });
  }
  res.json({ data: spec, error: null, meta: null });
});

// PUT /api/specs/:id
router.put('/:id', validate(updateSpecSchema), async (req: Request<{ id: string }>, res) => {
  const spec = await specService.updateSpec(req.params.id, req.body);
  if (!spec) {
    return res.status(404).json({
      data: null,
      error: { message: 'Spec not found', code: 'NOT_FOUND' },
      meta: null,
    });
  }
  res.json({ data: spec, error: null, meta: null });
});

// PUT /api/specs/:id/expectations
router.put('/:id/expectations', async (req: Request<{ id: string }>, res) => {
  const { expectation_ids } = req.body;
  if (!Array.isArray(expectation_ids)) {
    return res.status(400).json({
      data: null,
      error: { message: 'expectation_ids array is required', code: 'VALIDATION_ERROR' },
      meta: null,
    });
  }

  const linked = await specService.linkExpectations(req.params.id, expectation_ids);
  if (!linked) {
    return res.status(404).json({
      data: null,
      error: { message: 'Spec not found', code: 'NOT_FOUND' },
      meta: null,
    });
  }
  res.json({ data: { linked: true }, error: null, meta: null });
});

// GET /api/specs/:id/expectations
router.get('/:id/expectations', async (req: Request<{ id: string }>, res) => {
  const expectations = await specService.getSpecExpectations(req.params.id);
  res.json({ data: expectations, error: null, meta: { count: expectations.length } });
});

// GET /api/specs/:id/staleness
router.get('/:id/staleness', async (req: Request<{ id: string }>, res) => {
  const result = await specService.checkSpecStaleness(req.params.id);
  res.json({ data: result, error: null, meta: null });
});

// POST /api/specs/:id/transition
router.post('/:id/transition', validate(transitionSpecSchema), async (req: Request<{ id: string }>, res) => {
  const { to_phase, override_reason } = req.body;
  const userId = 'local-user';
  const result = await transitionService.transitionSpec(
    req.params.id, to_phase, userId, override_reason
  );
  if (!result.success) {
    const status = result.error === 'not_found' ? 404 : 422;
    return res.status(status).json({
      data: null,
      error: { message: result.error!, code: result.error!, checklist: result.checklist, wipCheck: result.wipCheck },
      meta: null,
    });
  }
  res.json({ data: { transitioned: true }, error: null, meta: null });
});

export default router;
