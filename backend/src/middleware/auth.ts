import {NextFunction, Request, Response} from 'express';
import {config} from '../config/config';
import logger from '../utils/logger';

// Helper function to truncate image data
const truncateImageData = (image: string): string => {
  if (!image) return '';
  // For base64 images, show first 20 chars and last 20 chars
  if (image.startsWith('data:')) {
    const base64Part = image.split(',')[1] || '';
    return `data:image/...;base64,${base64Part.substring(
      0,
      20,
    )}...${base64Part.substring(base64Part.length - 20)}`;
  }
  // For URLs, just show the first 50 chars
  return image.substring(0, 50) + '...';
};

export const authenticateUser = (
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
    // TODO: Verify token with Firebase Admin SDK
    logger.debug('Firebase token present, proceeding', {
      path: req.path,
      method: req.method,
      url: req.url,
    });
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
