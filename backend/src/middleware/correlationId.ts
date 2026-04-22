import {randomUUID} from 'crypto';
import {NextFunction, Request, Response} from 'express';

const HEADER = 'x-request-id';

/**
 * Propagates or assigns a request correlation id (header `X-Request-ID` / `x-request-id`).
 */
export const correlationId = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const incoming = req.get(HEADER);
  const id =
    incoming && incoming.trim().length > 0
      ? incoming.trim().slice(0, 128)
      : randomUUID();
  req.requestId = id;
  res.setHeader('X-Request-ID', id);
  next();
};
