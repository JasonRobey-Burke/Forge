import { ArtifactError } from '../lib/artifactDocument.js';
import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ArtifactError) {
    res.status(err.status).json({data:null,error:{code:err.code,message:err.message,details:err.details},meta:null});
    return;
  }
  console.error('Unhandled error:', err);
  res.status(500).json({
    data: null,
    error: { message: 'Internal server error', code: 'INTERNAL_ERROR' },
    meta: null,
  });
}
