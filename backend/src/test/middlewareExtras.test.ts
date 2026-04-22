import {describe, expect, it, jest} from '@jest/globals';
import {NextFunction} from 'express';
import {
  createErrorHandler,
  createRequestValidator,
} from '../middleware/index';

describe('middleware/index', () => {
  describe('createRequestValidator', () => {
    it('rejects when userId missing', () => {
      const mw = createRequestValidator();
      const req = {body: {}} as any;
      const res: any = {status: jest.fn().mockReturnThis(), json: jest.fn()};
      const next = jest.fn() as NextFunction;
      mw(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    it('normalizes images, prompt, matchId and calls next', () => {
      const mw = createRequestValidator();
      const req = {
        body: {
          userId: 'u1',
          images: ['data:image/jpeg;base64,abcdefghijklmnop'],
          prompt: undefined,
        },
      } as any;
      const res: any = {status: jest.fn().mockReturnThis(), json: jest.fn()};
      const next = jest.fn() as NextFunction;
      mw(req, res, next);
      expect(Array.isArray(req.body.images)).toBe(true);
      expect(req.body.prompt).toBe('');
      expect(req.body.matchId).toBe('no-match-selected');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('createErrorHandler', () => {
    it('maps ValidationError to 400', () => {
      const handler = createErrorHandler();
      const err = Object.assign(new Error('bad'), {name: 'ValidationError'});
      const res: any = {status: jest.fn().mockReturnThis(), json: jest.fn()};
      const next = jest.fn() as NextFunction;
      handler(err, {} as any, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('defaults to 500 for generic errors', () => {
      const handler = createErrorHandler();
      const err = new Error('boom');
      const res: any = {status: jest.fn().mockReturnThis(), json: jest.fn()};
      handler(err, {} as any, res, jest.fn() as NextFunction);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
