import {RateLimitInfo} from 'express-rate-limit';

declare global {
  namespace Express {
    interface Request {
      rateLimit?: RateLimitInfo;
      /** Set by `correlationId` middleware; echoed as `X-Request-ID`. */
      requestId?: string;
      /** Firebase-verified user (shape varies by route / middleware). */
      user?: {email?: string; uid?: string} & Record<string, unknown>;
    }
  }
}
