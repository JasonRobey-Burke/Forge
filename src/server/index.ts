import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/auth.js';
import { prisma } from './lib/prisma.js';
import productRouter from './routes/products.js';
import intentionRouter from './routes/intentions.js';
import expectationRouter from './routes/expectations.js';
import specRouter from './routes/specs.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check (before auth — exempt from authentication)
app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      data: { status: 'ok', timestamp: new Date().toISOString(), database: 'connected' },
      error: null,
      meta: null,
    });
  } catch {
    res.json({
      data: { status: 'degraded', timestamp: new Date().toISOString(), database: 'unreachable' },
      error: null,
      meta: null,
    });
  }
});

// Auth middleware — all routes below require authentication
app.use(authMiddleware);

// API routes
app.use('/api/products', productRouter);
app.use('/api/intentions', intentionRouter);
app.use('/api/expectations', expectationRouter);
app.use('/api/specs', specRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Forge API running on port ${PORT}`);
});

export default app;
