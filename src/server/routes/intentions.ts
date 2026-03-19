import { Router, type Request } from 'express';
import { validate } from '../middleware/validate.js';
import { createIntentionSchema, updateIntentionSchema } from '../../shared/schemas/intention.js';
import * as intentionService from '../services/intention.js';
import * as depService from '../services/intentionDependencies.js';

const router = Router();

// GET /api/intentions?product_id=xxx
router.get('/', async (req, res) => {
  const productId = req.query.product_id as string;
  if (!productId) {
    return res.status(400).json({
      data: null,
      error: { message: 'product_id query parameter is required', code: 'VALIDATION_ERROR' },
      meta: null,
    });
  }
  const intentions = await intentionService.listIntentions(productId);
  res.json({ data: intentions, error: null, meta: { count: intentions.length } });
});

// POST /api/intentions
router.post('/', validate(createIntentionSchema), async (req, res) => {
  const intention = await intentionService.createIntention(req.body);
  if (!intention) {
    return res.status(404).json({
      data: null,
      error: { message: 'Parent product not found', code: 'NOT_FOUND' },
      meta: null,
    });
  }
  res.status(201).json({ data: intention, error: null, meta: null });
});

// GET /api/intentions/:id
router.get('/:id', async (req: Request<{ id: string }>, res) => {
  const intention = await intentionService.getIntention(req.params.id);
  if (!intention) {
    return res.status(404).json({
      data: null,
      error: { message: 'Intention not found', code: 'NOT_FOUND' },
      meta: null,
    });
  }
  res.json({ data: intention, error: null, meta: null });
});

// PUT /api/intentions/:id
router.put('/:id', validate(updateIntentionSchema), async (req: Request<{ id: string }>, res) => {
  const intention = await intentionService.updateIntention(req.params.id, req.body);
  if (!intention) {
    return res.status(404).json({
      data: null,
      error: { message: 'Intention not found', code: 'NOT_FOUND' },
      meta: null,
    });
  }
  res.json({ data: intention, error: null, meta: null });
});

// DELETE /api/intentions/:id
router.delete('/:id', async (req: Request<{ id: string }>, res) => {
  const result = await intentionService.deleteIntention(req.params.id);
  if (!result.success) {
    if (result.error === 'has_children') {
      return res.status(409).json({
        data: null,
        error: { message: 'Cannot delete intention with active expectations', code: 'HAS_CHILDREN' },
        meta: null,
      });
    }
    return res.status(404).json({
      data: null,
      error: { message: 'Intention not found', code: 'NOT_FOUND' },
      meta: null,
    });
  }
  res.json({ data: { archived: true }, error: null, meta: null });
});

// POST /api/intentions/:id/dependencies
router.post('/:id/dependencies', async (req: Request<{ id: string }>, res) => {
  const { depends_on_id } = req.body;
  if (!depends_on_id) {
    return res.status(400).json({
      data: null,
      error: { message: 'depends_on_id is required', code: 'VALIDATION_ERROR' },
      meta: null,
    });
  }

  const result = await depService.addDependency(req.params.id, depends_on_id);
  if (!result.success) {
    return res.status(400).json({
      data: null,
      error: { message: result.error!, code: 'DEPENDENCY_ERROR' },
      meta: null,
    });
  }
  res.status(201).json({ data: { created: true }, error: null, meta: null });
});

// DELETE /api/intentions/:id/dependencies/:depId
router.delete('/:id/dependencies/:depId', async (req: Request<{ id: string; depId: string }>, res) => {
  const removed = await depService.removeDependency(req.params.id, req.params.depId);
  if (!removed) {
    return res.status(404).json({
      data: null,
      error: { message: 'Dependency not found', code: 'NOT_FOUND' },
      meta: null,
    });
  }
  res.json({ data: { removed: true }, error: null, meta: null });
});

export default router;
