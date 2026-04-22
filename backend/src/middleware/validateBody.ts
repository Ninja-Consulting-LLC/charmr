import {NextFunction, Request, Response} from 'express';
import {ZodSchema} from 'zod';

export const validateBody =
  <T>(schema: ZodSchema<T>) =>
  (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        statusCode: 400,
        details: parsed.error.flatten(),
      });
    }
    req.body = parsed.data as Request['body'];
    next();
  };
