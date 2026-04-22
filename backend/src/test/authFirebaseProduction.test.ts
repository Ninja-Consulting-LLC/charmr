import {afterAll, beforeEach, describe, expect, it, jest} from '@jest/globals';
import {NextFunction, Request, Response} from 'express';

const verifyIdToken = jest.fn() as jest.MockedFunction<any>;

jest.mock('../config/firebase-admin', () => ({
  firebaseAdmin: {
    auth: () => ({
      verifyIdToken: (...args: unknown[]) => verifyIdToken(...args),
    }),
  },
}));

describe('authenticateUser (production + token)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    verifyIdToken.mockReset();
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      OPENAI_API_KEY: 'k',
      GEMINI_API_KEY: 'k',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('accepts valid Bearer token', async () => {
    verifyIdToken.mockResolvedValue({uid: 'firebase-uid'});
    const {authenticateUser} = await import('../middleware/auth');
    const req = {
      path: '/api/matches',
      method: 'GET',
      url: '/api/matches',
      originalUrl: '/api/matches',
      baseUrl: '',
      headers: {authorization: 'Bearer good-token'},
      body: {},
      cookies: {},
    } as unknown as Request;
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();
    const res = {status, json} as unknown as Response;
    const next = jest.fn() as NextFunction;

    await authenticateUser(req, res, next);

    expect(verifyIdToken).toHaveBeenCalledWith('good-token');
    expect(next).toHaveBeenCalled();
    expect(status).not.toHaveBeenCalled();
  });

  it('returns 401 when token verification fails', async () => {
    verifyIdToken.mockRejectedValue(new Error('invalid'));
    const {authenticateUser} = await import('../middleware/auth');
    const req = {
      path: '/api/matches',
      method: 'GET',
      url: '/api/matches',
      originalUrl: '/api/matches',
      baseUrl: '',
      headers: {authorization: 'Bearer bad'},
      body: {},
      cookies: {},
    } as unknown as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await authenticateUser(req, res, next);

    expect((res as any).status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows x-anonymous-user without Firebase token', async () => {
    const {authenticateUser} = await import('../middleware/auth');
    const req = {
      path: '/api/matches',
      method: 'GET',
      url: '/api/matches',
      originalUrl: '/api/matches',
      baseUrl: '',
      headers: {'x-anonymous-user': 'anon-1'},
      body: {},
      cookies: {},
    } as unknown as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await authenticateUser(req, res, next);

    expect(verifyIdToken).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('POST /api/users/link with Bearer skips anonymous DB check', async () => {
    verifyIdToken.mockResolvedValue({uid: 'u'});
    const {authenticateUser} = await import('../middleware/auth');
    const req = {
      path: '/api/users/link',
      method: 'POST',
      url: '/api/users/link',
      originalUrl: '/api/users/link',
      baseUrl: '',
      headers: {authorization: 'Bearer t'},
      body: {},
      cookies: {},
    } as unknown as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await authenticateUser(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('POST /api/users/link without credentials returns 401', async () => {
    const {authenticateUser} = await import('../middleware/auth');
    const req = {
      path: '/api/users/link',
      method: 'POST',
      url: '/api/users/link',
      originalUrl: '/api/users/link',
      baseUrl: '',
      headers: {},
      body: {},
      cookies: {},
    } as unknown as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await authenticateUser(req, res, next);
    expect((res as any).status).toHaveBeenCalledWith(401);
  });

  it('POST /api/users/link with anonymous header and body proceeds', async () => {
    const {authenticateUser} = await import('../middleware/auth');
    const req = {
      path: '/api/users/link',
      method: 'POST',
      url: '/api/users/link',
      originalUrl: '/api/users/link',
      baseUrl: '',
      headers: {'x-anonymous-user': 'anon-2'},
      body: {anonymousUserId: 'anon-2'},
      cookies: {},
    } as unknown as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await authenticateUser(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
