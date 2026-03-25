import { Router, type Request } from 'express';
import { validate } from '../middleware/validate.js';
import { updateExpectationSchema } from '../../shared/schemas/expectation.js';
import * as expectationService from '../services/expectation.js';

const router = Router();

// GET /api/expectations?intention_id=xxx
router.get('/', async (req, res) => {
  const intentionId = req.query.intention_id as string;
  if (!intentionId) {
    return res.status(400).json({
      data: null,
      error: { message: 'intention_id query parameter is required', code: 'VALIDATION_ERROR' },
      meta: null,
    });
  }
  const expectations = await expectationService.listExpectations(intentionId);
  res.json({ data: expectations, error: null, meta: { count: expectations.length } });
});

// GET /api/expectations/:id
router.get('/:id', async (req: Request<{ id: string }>, res) => {
  const expectation = await expectationService.getExpectation(req.params.id);
  if (!expectation) {
    return res.status(404).json({
      data: null,
      error: { message: 'Expectation not found', code: 'NOT_FOUND' },
      meta: null,
    });
  }
  res.json({ data: expectation, error: null, meta: null });
});

// PUT /api/expectations/:id
router.put('/:id', validate(updateExpectationSchema), async (req: Request<{ id: string }>, res) => {
  const expectation = await expectationService.updateExpectation(req.params.id, req.body);
  if (!expectation) {
    return res.status(404).json({
      data: null,
      error: { message: 'Expectation not found', code: 'NOT_FOUND' },
      meta: null,
    });
  }
  res.json({ data: expectation, error: null, meta: null });
});

export default router;
