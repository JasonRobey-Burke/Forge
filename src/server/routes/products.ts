import { readEvidence } from '../lib/evidenceFiles.js';
import { getStore } from '../lib/yamlStore.js';
import { getWorkspace } from '../services/workspace.js';
import { precondition, requireRevision, sourceMeta, listSources } from '../middleware/precondition.js';
import { Router, type Request } from 'express';
import { validate } from '../middleware/validate.js';
import { updateProductSchema } from '../../shared/schemas/product.js';
import * as productService from '../services/product.js';

const router = Router();
router.use(precondition);

// GET /api/products
router.get('/', async (_req, res) => {
  const products = await productService.listProducts();
  res.json({ data: products, error: null, meta: { count: products.length, sources: listSources('products', products) } });
});

router.get('/:id/workspace', async (req: Request<{ id: string }>, res) => {
  const data = await getWorkspace(req.params.id);
  if (!data) return res.status(404).json({ data: null, error: { message: 'Product not found', code: 'NOT_FOUND' }, meta: null });
  res.json({ data, error: null, meta: {} });
});

router.get('/:id/evidence', async (req: Request<{ id: string }>, res) => {
  const workspace = await getWorkspace(req.params.id);
  if (!workspace) return res.status(404).json({data:null,error:{code:'NOT_FOUND',message:'Product not found'},meta:null});
  const relativePath = req.query.path;
  if (typeof relativePath !== 'string' || !workspace.evidence.some(ref => ref.path === relativePath))
    return res.status(400).json({data:null,error:{code:'INVALID_PATH',message:'Select an associated source from this product’s evidence list.'},meta:null});
  const content = await readEvidence(getStore().getDocsRoot(), relativePath);
  res.json({data:{path:relativePath,content},error:null,meta:null});
});

// GET /api/products/:id
router.get('/:id', async (req: Request<{ id: string }>, res) => {
  const product = await productService.getProduct(req.params.id);
  if (!product) {
    return res.status(404).json({
      data: null,
      error: { message: 'Product not found', code: 'NOT_FOUND' },
      meta: null,
    });
  }
  res.json({ data: product, error: null, meta: sourceMeta(res,'products',req.params.id) });
});

// PUT /api/products/:id
router.put('/:id', validate(updateProductSchema), async (req: Request<{ id: string }>, res) => {
  const product = await productService.updateProduct(req.params.id, req.body, requireRevision(req));
  if (!product) {
    return res.status(404).json({
      data: null,
      error: { message: 'Product not found', code: 'NOT_FOUND' },
      meta: null,
    });
  }
  res.json({ data: product, error: null, meta: sourceMeta(res,'products',req.params.id) });
});

export default router;
