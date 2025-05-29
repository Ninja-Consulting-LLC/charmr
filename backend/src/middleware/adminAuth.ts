import {NextFunction, Request, Response} from 'express';
import {config} from '../config/config';
import logger from '../utils/logger';

export const adminAuth = (req: Request, res: Response, next: NextFunction) => {
  // TEMP: Log admin token and Authorization header for debugging
  console.log('ADMIN TOKEN (from env):', process.env.ADMIN_TOKEN);
  console.log('Authorization header:', req.headers.authorization);

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    logger.warn('No authorization header in admin request');
    return res.status(401).json({error: 'No authorization header'});
  }

  const [type, token] = authHeader.split(' ');

  if (type !== 'Bearer' || !token) {
    logger.warn('Invalid authorization header format in admin request');
    return res.status(401).json({error: 'Invalid authorization header format'});
  }

  if (token !== config.admin.token) {
    logger.warn('Invalid admin token used', {providedToken: token});
    return res.status(403).json({error: 'Invalid admin token'});
  }

  next();
};
