import {describe, expect, it, jest} from '@jest/globals';
import {NextFunction} from 'express';
import {requestLogger} from '../middleware/requestLogger';

describe('requestLogger', () => {
  it('calls next and logs on response finish', () => {
    const listeners: Record<string, (() => void)[]> = {};
    const res = {
      statusCode: 200,
      on: jest.fn((event: string, cb: () => void) => {
        listeners[event] = listeners[event] || [];
        listeners[event].push(cb);
        return res;
      }),
    };
    const req = {method: 'GET', url: '/x', ip: '1.1.1.1'};
    const next = jest.fn() as NextFunction;

    requestLogger(req as any, res as any, next);

    expect(next).toHaveBeenCalled();
    expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
    for (const cb of listeners.finish || []) {
      cb();
    }
  });
});
