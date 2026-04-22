import {NextFunction, Request, Response} from 'express';
import rateLimit from 'express-rate-limit';
import {config} from '../config/config';
import {ErrorResponse} from '../types';
import logger from '../utils/logger';
import {authenticateUser} from './auth';

export {authenticateUser};

// Helper function to format retry time
const formatRetryAfter = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// Rate limit handler factory
const createRateLimitHandler =
  (errorMessage: string) => (req: Request, res: Response) => {
    const retryAfter = req.rateLimit?.resetTime
      ? Math.ceil((Number(req.rateLimit.resetTime) - Date.now()) / 1000)
      : 60;

    res.status(429).json({
      error: errorMessage,
      retryAfter: formatRetryAfter(retryAfter),
    });
  };

// General rate limiter for all routes
export const createGeneralLimiter = () =>
  rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: _req => {
      const isDevelopment = config.server.environment === 'development';
      return isDevelopment;
    },
    keyGenerator: req => req.body.userId || req.ip,
    handler: createRateLimitHandler('Too many requests'),
  });

// User creation rate limiter - more lenient
export const createUserCreationLimiter = () =>
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // Allow 10 user creation requests per minute
    standardHeaders: true,
    legacyHeaders: false,
    skip: _req => {
      const isDevelopment = config.server.environment === 'development';
      return isDevelopment;
    },
    keyGenerator: req => req.body.installationId || req.ip,
    handler: createRateLimitHandler('Too many user creation requests'),
  });

// Specific rate limiter for generate-reply endpoint
export const createGenerateReplyLimiter = () =>
  rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100, // Limit each user to 100 requests per hour
    standardHeaders: true,
    legacyHeaders: false,
    skip: req => req.body.skipRateLimiting === true,
    keyGenerator: req => req.body.userId || req.ip,
    handler: createRateLimitHandler('Too many message generation requests'),
  });

// Device token update rate limiter
export const createDeviceTokenLimiter = () =>
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // Allow 5 requests per minute
    standardHeaders: true,
    legacyHeaders: false,
    skip: _req => {
      const isDevelopment = config.server.environment === 'development';
      return isDevelopment;
    },
    keyGenerator: req => req.params.userId || req.ip || 'unknown',
    handler: createRateLimitHandler('Too many device token update requests'),
  });

// Error handling middleware
export const createErrorHandler =
  () => (err: Error, req: Request, res: Response, _next: NextFunction) => {
    logger.error('Request pipeline error', {
      requestId: req.requestId,
      message: err.message,
      name: err.name,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });

    const errorResponse: ErrorResponse = {
      error: err.message || 'Internal Server Error',
      statusCode: 500,
    };

    if (err.name === 'ValidationError') {
      errorResponse.statusCode = 400;
    }

    res.status(errorResponse.statusCode).json(errorResponse);
  };

// Request validation middleware
export const createRequestValidator =
  () => (req: Request, res: Response, next: NextFunction) => {
    // Create a truncated version of the request for logging
    const truncatedRequest = {
      ...req.body,
      images:
        req.body.images?.map((img: string) => {
          // Remove the data:image/jpeg;base64, prefix if present
          const base64Data = img.includes('base64,')
            ? img.split('base64,')[1]
            : img;
          // Truncate to first 20 characters of the actual base64 data
          return `data:image/jpeg;base64,${base64Data.substring(0, 20)}...`;
        }) || [],
    };
    logger.debug(
      `[${new Date().toISOString()}] [Validator] Received request:`,
      JSON.stringify(truncatedRequest, null, 2),
    );

    if (!req.body.userId) {
      logger.debug(
        `[${new Date().toISOString()}] Missing required field: userId`,
      );
      return res.status(400).json({
        error: 'Missing required field: userId',
        statusCode: 400,
      });
    }

    // Ensure images is always an array
    if (!Array.isArray(req.body.images)) {
      req.body.images = [];
    }

    // Set default empty prompt if not provided
    if (req.body.prompt === undefined) {
      req.body.prompt = '';
    }

    // Set default matchId if not provided
    if (!req.body.matchId) {
      req.body.matchId = 'no-match-selected';
    }

    next();
  };
