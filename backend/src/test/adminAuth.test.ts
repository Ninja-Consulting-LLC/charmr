import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {NextFunction} from 'express';
import {firebaseAdmin} from '../config/firebase-admin';
import {adminAuth} from '../middleware/adminAuth';

jest.mock('../config/firebase-admin', () => ({
  firebaseAdmin: {
    auth: jest.fn(),
  },
}));

describe('adminAuth', () => {
  let verifyIdToken: jest.MockedFunction<any>;
  let getUser: jest.MockedFunction<any>;

  beforeEach(() => {
    verifyIdToken = jest.fn() as jest.MockedFunction<any>;
    getUser = jest.fn() as jest.MockedFunction<any>;
    (firebaseAdmin.auth as jest.Mock).mockReturnValue({
      verifyIdToken,
      getUser,
    });
  });

  it('returns 401 without authorization header', async () => {
    const res: any = {status: jest.fn().mockReturnThis(), json: jest.fn()};
    const next = jest.fn() as NextFunction;
    await adminAuth({headers: {}} as any, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for invalid bearer format', async () => {
    const res: any = {status: jest.fn().mockReturnThis(), json: jest.fn()};
    await adminAuth(
      {headers: {authorization: 'Basic x'}} as any,
      res,
      jest.fn() as NextFunction,
    );
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 403 when user is not admin', async () => {
    verifyIdToken.mockResolvedValue({uid: 'a', email: 'a@b.com'});
    getUser.mockResolvedValue({customClaims: {}});
    const res: any = {status: jest.fn().mockReturnThis(), json: jest.fn()};
    await adminAuth(
      {headers: {authorization: 'Bearer tok'}} as any,
      res,
      jest.fn() as NextFunction,
    );
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('calls next when admin claim is true', async () => {
    verifyIdToken.mockResolvedValue({uid: 'a'});
    getUser.mockResolvedValue({customClaims: {admin: true}});
    const res: any = {status: jest.fn().mockReturnThis(), json: jest.fn()};
    const next = jest.fn() as NextFunction;
    const req: any = {headers: {authorization: 'Bearer tok'}};
    await adminAuth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({uid: 'a'});
  });

  it('returns 401 when verifyIdToken throws', async () => {
    verifyIdToken.mockRejectedValue(new Error('invalid'));
    const res: any = {status: jest.fn().mockReturnThis(), json: jest.fn()};
    await adminAuth(
      {headers: {authorization: 'Bearer bad'}} as any,
      res,
      jest.fn() as NextFunction,
    );
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
