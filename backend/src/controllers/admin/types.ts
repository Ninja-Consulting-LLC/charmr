import {Request} from 'express';

/** Firebase ID token shape after admin auth middleware. */
export interface AuthenticatedRequest extends Request {
  user?: {
    email?: string;
  };
}
