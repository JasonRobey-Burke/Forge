import { Request, Response, NextFunction } from 'express';
import { ZodType } from 'zod';

export function validate(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        data: null,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: result.error.issues,
        },
        meta: null,
      });
    }
    req.body = result.data;
    next();
  };
}
