import {NextFunction, Request, Response} from 'express';
import {firebaseAdmin} from '../config/firebase-admin';
import logger from '../utils/logger';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const adminAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Enhanced logging for admin token debugging
  logger.info('Admin Auth Debug:', {
    authHeader: req.headers.authorization,
    headers: req.headers,
  });

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    logger.warning('No authorization header in admin request');
    return res.status(401).json({error: 'No authorization header'});
  }

  const [type, token] = authHeader.split(' ');

  if (type !== 'Bearer' || !token) {
    logger.warning('Invalid authorization header format in admin request');
    return res.status(401).json({error: 'Invalid authorization header format'});
  }

  try {
    // Verify the Firebase token
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);

    // Check if the user has admin role in custom claims
    const user = await firebaseAdmin.auth().getUser(decodedToken.uid);
    const isAdmin = user.customClaims?.admin === true;

    if (!isAdmin) {
      logger.warning('User is not an admin', {
        uid: decodedToken.uid,
        email: decodedToken.email,
      });
      return res.status(403).json({error: 'User is not an admin'});
    }

    // Add the decoded token to the request for use in route handlers
    req.user = decodedToken;
    next();
  } catch (error) {
    logger.error('Error verifying admin token:', error);
    return res.status(401).json({error: 'Invalid token'});
  }
};
