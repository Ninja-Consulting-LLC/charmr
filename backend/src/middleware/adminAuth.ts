import {NextFunction, Request, Response} from 'express';
import {config} from '../config/config';

export const adminAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({error: 'No authorization header'});
  }

  const [type, token] = authHeader.split(' ');

  if (type !== 'Bearer' || !token) {
    return res.status(401).json({error: 'Invalid authorization header format'});
  }

  if (token !== config.admin.token) {
    return res.status(403).json({error: 'Invalid admin token'});
  }

  next();
};
