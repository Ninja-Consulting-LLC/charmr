import {NextFunction, Request, Response} from 'express';
import {config} from '../config/config';

export const authenticateUser = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.log(`[${new Date().toISOString()}] [Auth] Checking authentication:`, {
    path: req.path,
    method: req.method,
    headers: {
      authorization: req.headers.authorization ? 'Bearer [REDACTED]' : 'none',
      'x-auth-bypass': req.headers['x-auth-bypass'] || 'false',
    },
  });

  // Skip auth in development or if auth bypass header is present
  if (
    config.server.environment === 'development' ||
    req.headers['x-auth-bypass'] === 'true'
  ) {
    console.log(`[${new Date().toISOString()}] [Auth] Auth bypassed`);
    return next();
  }

  // Check for auth header in production
  if (!req.headers.authorization) {
    console.log(`[${new Date().toISOString()}] [Auth] No auth header found`);
    return res.status(401).json({error: 'User not authenticated'});
  }

  // TODO: Verify token with Firebase Admin SDK
  console.log(
    `[${new Date().toISOString()}] [Auth] Auth header present, proceeding`,
  );
  next();
};
