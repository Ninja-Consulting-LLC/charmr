import {NextFunction, Request, Response} from 'express';
import {config} from '../config/config';
import {firebaseAdmin} from '../config/firebase-admin';
import logger from '../utils/logger';

// Helper to truncate image data for logging
const truncateImageData = (image: any) => {
  if (typeof image === 'string') {
    return image.substring(0, 50) + '...';
  }
  return image;
};

export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Create a copy of the body with truncated images
  const truncatedBody = req.body.images
    ? {
        ...req.body,
        images: req.body.images.map(truncateImageData),
      }
    : req.body;

  logger.debug('Checking authentication', {
    path: req.path,
    method: req.method,
    url: req.url,
    originalUrl: req.originalUrl,
    baseUrl: req.baseUrl,
    headers: {
      authorization: req.headers.authorization ? 'Bearer [REDACTED]' : 'none',
      'x-anonymous-user': req.headers['x-anonymous-user'] || 'none',
      'content-type': req.headers['content-type'],
    },
    cookies: req.cookies,
    body: truncatedBody,
  });

  // Skip auth in development
  if (config.server.environment === 'development') {
    logger.debug('Auth bypassed in development', {
      environment: config.server.environment,
    });
    return next();
  }

  // Check for either Firebase token or anonymous user ID
  const hasFirebaseToken = req.headers.authorization?.startsWith('Bearer ');
  const hasAnonymousUser = req.headers['x-anonymous-user'];

  if (!hasFirebaseToken && !hasAnonymousUser) {
    logger.warn('No auth credentials found', {
      path: req.path,
      method: req.method,
      url: req.url,
    });
    return res.status(401).json({error: 'User not authenticated'});
  }

  // If using Firebase token, verify it
  if (hasFirebaseToken) {
    try {
      const token = req.headers.authorization!.split(' ')[1];
      const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);

      // Add the decoded token to the request for use in route handlers
      req.user = decodedToken;

      logger.debug('Firebase token verified', {
        path: req.path,
        method: req.method,
        url: req.url,
        uid: decodedToken.uid,
      });
    } catch (error) {
      logger.warn('Invalid Firebase token', {
        error: error instanceof Error ? error.message : 'Unknown error',
        path: req.path,
        method: req.method,
        url: req.url,
      });
      return res.status(401).json({error: 'Invalid token'});
    }
  } else {
    // If using anonymous user ID, verify it exists in the database
    logger.debug('Anonymous user ID present, proceeding', {
      path: req.path,
      method: req.method,
      url: req.url,
      anonymousUserId: req.headers['x-anonymous-user'],
    });
  }

  next();
};
