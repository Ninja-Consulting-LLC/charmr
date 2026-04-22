import {afterEach, describe, expect, it, jest} from '@jest/globals';
describe('middleware/index rate limit factories', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = {...originalEnv};
    jest.resetModules();
  });

  it('createGenerateReplyLimiter skips when body.skipRateLimiting is true', async () => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      OPENAI_API_KEY: 'k',
      GEMINI_API_KEY: 'k',
    };
    const {createGenerateReplyLimiter} = await import('../middleware/index');
    const mw = createGenerateReplyLimiter();
    const next = jest.fn();
    const res: any = {status: jest.fn().mockReturnThis(), json: jest.fn()};
    const req = {
      ip: '7.7.7.7',
      body: {userId: 'u1', skipRateLimiting: true},
      connection: {},
    } as any;

    for (let i = 0; i < 150; i++) {
      await mw(req, res, next as any);
    }
    expect(next).toHaveBeenCalledTimes(150);
    expect(res.status).not.toHaveBeenCalled();
  });
});
