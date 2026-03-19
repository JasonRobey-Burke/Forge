import { Router, type Request } from 'express';
import { validate } from '../middleware/validate.js';
import { createProductSchema, updateProductSchema } from '../../shared/schemas/product.js';
import * as productService from '../services/product.js';

const router = Router();

// GET /api/products
router.get('/', async (_req, res) => {
  const products = await productService.listProducts();
  res.json({ data: products, error: null, meta: { count: products.length } });
});

// POST /api/products
router.post('/', validate(createProductSchema), async (req, res) => {
  const product = await productService.createProduct(req.body);
  res.status(201).json({ data: product, error: null, meta: null });
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
  res.json({ data: product, error: null, meta: null });
});

// PUT /api/products/:id
router.put('/:id', validate(updateProductSchema), async (req: Request<{ id: string }>, res) => {
  const product = await productService.updateProduct(req.params.id, req.body);
  if (!product) {
    return res.status(404).json({
      data: null,
      error: { message: 'Product not found', code: 'NOT_FOUND' },
      meta: null,
    });
  }
  res.json({ data: product, error: null, meta: null });
});

// DELETE /api/products/:id
router.delete('/:id', async (req: Request<{ id: string }>, res) => {
  const deleted = await productService.deleteProduct(req.params.id);
  if (!deleted) {
    return res.status(404).json({
      data: null,
      error: { message: 'Product not found', code: 'NOT_FOUND' },
      meta: null,
    });
  }
  res.json({ data: { archived: true }, error: null, meta: null });
});

export default router;
