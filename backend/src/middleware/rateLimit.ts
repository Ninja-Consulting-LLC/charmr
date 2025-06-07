import {NextFunction, Request, Response} from 'express';
import logger from '../utils/logger';

export interface RateLimitResult {
  allowed: boolean;
  retryAfter: string;
}

interface RateLimitEntry {
  count: number;
  startTime: number;
}

export const createRateLimiter = () => {
  const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  const MAX_REQUESTS = 100; // requests per window

  // In-memory store for rate limiting
  // In production, this should use Redis or similar
  const ipLimits = new Map<string, RateLimitEntry>();

  const check = async (ip: string): Promise<RateLimitResult> => {
    try {
      const now = Date.now();
      const entry = ipLimits.get(ip);

      // Clean up old entries
      if (entry && now - entry.startTime >= WINDOW_MS) {
        ipLimits.delete(ip);
      }

      if (!entry) {
        // First request from this IP
        ipLimits.set(ip, {count: 1, startTime: now});
        return {
          allowed: true,
          retryAfter: '0s',
        };
      }

      if (entry.count >= MAX_REQUESTS) {
        const timeLeft = Math.ceil(
          (WINDOW_MS - (now - entry.startTime)) / 1000,
        );
        return {
          allowed: false,
          retryAfter: `${timeLeft}s`,
        };
      }

      // Increment request count
      entry.count++;
      return {
        allowed: true,
        retryAfter: '0s',
      };
    } catch (error) {
      logger.error('Failed to check rate limit', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      // In case of error, allow the request but log it
      return {
        allowed: true,
        retryAfter: '0s',
      };
    }
  };

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = req.ip || req.connection.remoteAddress || '';
      const result = await check(ip);

      if (!result.allowed) {
        res.status(429).json({
          error: 'Too many requests',
          retryAfter: result.retryAfter,
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Rate limiter middleware error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      next();
    }
  };
};
