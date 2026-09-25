import { createExpectationDraft, reparentExpectation } from '../services/artifactCreation.js';
import { createExpectationDraftSchema, reparentExpectationSchema } from '../../shared/schemas/creation.js';
import { precondition, requireRevision, sourceMeta, listSources } from '../middleware/precondition.js';
import { Router, type Request } from 'express';
import { validate } from '../middleware/validate.js';
import { updateExpectationSchema } from '../../shared/schemas/expectation.js';
import * as expectationService from '../services/expectation.js';

const router = Router();
router.use(precondition);
router.post('/',validate(createExpectationDraftSchema),async(req,res)=>{
  const result=await createExpectationDraft(req.body,requireRevision(req));
  res.status(201).json({data:result.data,error:null,meta:{source:result.source}});
});
router.post('/:id/reparent',validate(reparentExpectationSchema),async(req: Request<{id:string}>,res)=>{
  const result=await reparentExpectation(req.params.id,req.body,requireRevision(req));
  res.json({data:result.data,error:null,meta:{source:result.source}});
});

// GET /api/expectations?intention_id=xxx  |  GET /api/expectations?product_id=xxx
router.get('/', async (req, res) => {
  const intentionId = req.query.intention_id as string;
  const productId = req.query.product_id as string;
  if (!intentionId && !productId) {
    return res.status(400).json({
      data: null,
      error: { message: 'intention_id or product_id query parameter is required', code: 'VALIDATION_ERROR' },
      meta: null,
    });
  }
  const expectations = intentionId
    ? await expectationService.listExpectations(intentionId)
    : await expectationService.listExpectationsByProduct(productId);
  res.json({ data: expectations, error: null, meta: { count: expectations.length, sources: listSources('expectations', expectations) } });
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
  res.json({ data: expectation, error: null, meta: sourceMeta(res,'expectations',req.params.id) });
});

// PUT /api/expectations/:id
router.put('/:id', validate(updateExpectationSchema), async (req: Request<{ id: string }>, res) => {
  const expectation = await expectationService.updateExpectation(req.params.id, req.body, requireRevision(req));
  if (!expectation) {
    return res.status(404).json({
      data: null,
      error: { message: 'Expectation not found', code: 'NOT_FOUND' },
      meta: null,
    });
  }
  res.json({ data: expectation, error: null, meta: sourceMeta(res,'expectations',req.params.id) });
});

export default router;
