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
      'x-auth-bypass': req.headers['x-auth-bypass'] || 'false',
      'content-type': req.headers['content-type'],
    },
    cookies: req.cookies,
    body: truncatedBody,
  });

  // Skip auth in development or if auth bypass header is present
  if (
    config.server.environment === 'development' ||
    req.headers['x-auth-bypass'] === 'true'
  ) {
    logger.debug('Auth bypassed', {
      environment: config.server.environment,
      authBypass: req.headers['x-auth-bypass'],
    });
    return next();
  }

  // Check for auth header in production
  if (!req.headers.authorization) {
    logger.warn('No auth header found', {
      path: req.path,
      method: req.method,
      url: req.url,
    });
    return res.status(401).json({error: 'User not authenticated'});
  }

  // TODO: Verify token with Firebase Admin SDK
  logger.debug('Auth header present, proceeding', {
    path: req.path,
    method: req.method,
    url: req.url,
  });
  next();
};
