import {NextFunction, Request, Response} from 'express';
import {config} from '../config/config';
import logger from '../utils/logger';

export const authenticateUser = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  logger.debug('Checking authentication', {
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
    logger.debug('Auth bypassed');
    return next();
  }

  // Check for auth header in production
  if (!req.headers.authorization) {
    logger.warn('No auth header found');
    return res.status(401).json({error: 'User not authenticated'});
  }

  // TODO: Verify token with Firebase Admin SDK
  logger.debug('Auth header present, proceeding');
  next();
};
