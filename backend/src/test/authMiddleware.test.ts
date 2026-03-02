import {afterAll, beforeEach, describe, expect, it, jest} from '@jest/globals';
import {NextFunction, Request, Response} from 'express';

type ResponseMock = {
  status: ReturnType<typeof jest.fn>;
  json: ReturnType<typeof jest.fn>;
};

const createMockResponse = (): ResponseMock => {
  const response: ResponseMock = {
    status: jest.fn(),
    json: jest.fn(),
  };

  response.status.mockReturnValue(response);
  response.json.mockReturnValue(response);
  return response;
};

const createMockRequest = (overrides: Partial<Request> = {}) =>
  ({
    path: '/api/support',
    method: 'POST',
    url: '/api/support',
    originalUrl: '/api/support',
    baseUrl: '',
    headers: {},
    body: {},
    cookies: {},
    ...overrides,
  }) as Request;

describe('authenticateUser middleware', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {...originalEnv};
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('allows auth bypass only for POST /api/support', async () => {
    process.env.NODE_ENV = 'production';
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.GEMINI_API_KEY = 'test-gemini-key';

    const {authenticateUser} = await import('../middleware/auth');
    const req = createMockRequest({
      headers: {'x-auth-bypass': 'true'},
    });
    const res = createMockResponse();
    const next = jest.fn() as NextFunction;

    await authenticateUser(req, res as unknown as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated non-support requests in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.GEMINI_API_KEY = 'test-gemini-key';

    const {authenticateUser} = await import('../middleware/auth');
    const req = createMockRequest({
      path: '/api/users/test-user',
      method: 'GET',
      url: '/api/users/test-user',
      originalUrl: '/api/users/test-user',
      headers: {},
    });
    const res = createMockResponse();
    const next = jest.fn() as NextFunction;

    await authenticateUser(req, res as unknown as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({error: 'User not authenticated'});
  });

  it('still bypasses auth for development environment', async () => {
    process.env.NODE_ENV = 'development';

    const {authenticateUser} = await import('../middleware/auth');
    const req = createMockRequest({
      path: '/api/users/test-user',
      method: 'GET',
      url: '/api/users/test-user',
      originalUrl: '/api/users/test-user',
      headers: {},
    });
    const res = createMockResponse();
    const next = jest.fn() as NextFunction;

    await authenticateUser(req, res as unknown as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
