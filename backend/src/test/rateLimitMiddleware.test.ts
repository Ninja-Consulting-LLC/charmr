import {afterEach, describe, expect, it, jest} from '@jest/globals';
import {NextFunction} from 'express';

describe('createRateLimiter', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = {...originalEnv};
    jest.resetModules();
  });

  it('skips limiting in development', async () => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      NODE_ENV: 'development',
      OPENAI_API_KEY: 'k',
      GEMINI_API_KEY: 'k',
    };
    const {createRateLimiter} = await import('../middleware/rateLimit');
    const mw = createRateLimiter();
    const next = jest.fn() as NextFunction;
    const res: any = {status: jest.fn().mockReturnThis(), json: jest.fn()};
    await mw({ip: '1.1.1.1', connection: {}} as any, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 429 after max requests in production', async () => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      OPENAI_API_KEY: 'k',
      GEMINI_API_KEY: 'k',
    };
    const {createRateLimiter} = await import('../middleware/rateLimit');
    const mw = createRateLimiter();
    const next = jest.fn() as jest.MockedFunction<any>;
    const res: any = {status: jest.fn().mockReturnThis(), json: jest.fn()};
    const req = {ip: '2.2.2.2', connection: {}} as any;

    for (let i = 0; i < 100; i++) {
      await mw(req, res, next as NextFunction);
    }
    expect(next).toHaveBeenCalledTimes(100);
    next.mockClear();
    await mw(req, res, next as NextFunction);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({error: 'Too many requests'}),
    );
    expect(next).not.toHaveBeenCalled();
  });
});
