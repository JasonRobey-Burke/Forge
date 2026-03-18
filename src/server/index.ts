import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/auth.js';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
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

// API routes will be added here in future specs

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Forge API running on port ${PORT}`);
});

export default app;
