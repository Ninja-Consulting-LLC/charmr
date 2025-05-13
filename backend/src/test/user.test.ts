import {afterEach, beforeEach, describe, expect, it} from '@jest/globals';
import {Request, Response} from 'express';
import * as adminController from '../controllers/adminController';
import {getDatabase} from '../db';
import {SubscriptionTier} from '../types/enums';

describe('User Domain', () => {
  let db: any;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseObject: any;

  beforeEach(async () => {
    db = await getDatabase();

    // Clean up any existing test data first
    await db.run('DELETE FROM messages WHERE userId = ?', 'test-user-123');
    await db.run('DELETE FROM matches WHERE userId = ?', 'test-user-123');
    await db.run('DELETE FROM users WHERE id = ?', 'test-user-123');

    // Setup mock request
    mockRequest = {
      params: {userId: 'test-user-123'},
      body: {email: 'test@example.com', name: 'Test User'},
      headers: {},
      cookies: {},
    };

    // Setup mock response
    responseObject = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockImplementation(result => {
        responseObject = result;
        return mockResponse;
      }),
    };
  });

  afterEach(async () => {
    // Clean up test data
    await db.run('DELETE FROM users WHERE id = ?', 'test-user-123');
  });

  describe('User Creation', () => {
    it('should create a new user successfully', async () => {
      const createRequest = {
        ...mockRequest,
        body: {
          id: 'test-user-123',
          email: 'test@example.com',
          name: 'Test User',
        },
      } as Request;

      await adminController.createUser(
        createRequest,
        mockResponse as Response,
        db,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(responseObject).toMatchObject({
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
      });
    });

    it('should handle invalid user data', async () => {
      const createRequest = {
        ...mockRequest,
        body: {
          id: 'test-user-123',
          email: '',
          name: '',
        },
      } as Request;

      await adminController.createUser(
        createRequest,
        mockResponse as Response,
        db,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(responseObject).toHaveProperty('error');
    });

    it('should prevent duplicate users', async () => {
      // First user
      const createRequest = {
        ...mockRequest,
        body: {
          id: 'test-user-123',
          email: 'test@example.com',
          name: 'Test User',
        },
      } as Request;

      await adminController.createUser(
        createRequest,
        mockResponse as Response,
        db,
      );

      // Try to create duplicate
      await adminController.createUser(
        createRequest,
        mockResponse as Response,
        db,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(responseObject).toHaveProperty('error');
    });
  });

  describe('User Profile Updates', () => {
    it('should update user profile correctly', async () => {
      // First create a user
      const createRequest = {
        ...mockRequest,
        body: {
          id: 'test-user-123',
          email: 'test@example.com',
          name: 'Test User',
        },
      } as Request;

      await adminController.createUser(
        createRequest,
        mockResponse as Response,
        db,
      );

      // Update profile using controller
      const updateRequest = {
        ...mockRequest,
        params: {userId: 'test-user-123'},
        body: {
          name: 'Updated Name',
        },
      } as Request;

      await adminController.updateUser(
        updateRequest,
        mockResponse as Response,
        db,
      );

      // Verify update
      const getRequest = {
        ...mockRequest,
        params: {userId: 'test-user-123'},
      } as Request;

      await adminController.getUser(getRequest, mockResponse as Response, db);

      expect(responseObject).toMatchObject({
        id: 'test-user-123',
        name: 'Updated Name',
      });
    });

    it('should handle invalid profile updates', async () => {
      const updateRequest = {
        ...mockRequest,
        params: {userId: 'non-existent-id'},
        body: {
          name: 'Updated Name',
        },
      } as Request;

      await adminController.updateUser(
        updateRequest,
        mockResponse as Response,
        db,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(responseObject).toHaveProperty('error');
    });
  });

  describe('User Subscription Management', () => {
    it('should update subscription tier correctly', async () => {
      // First create a user
      const createRequest = {
        ...mockRequest,
        body: {
          id: 'test-user-123',
          email: 'test@example.com',
          name: 'Test User',
        },
      } as Request;

      await adminController.createUser(
        createRequest,
        mockResponse as Response,
        db,
      );

      // Update subscription
      const updateRequest = {
        ...mockRequest,
        body: {
          plan: SubscriptionTier.PRO,
        },
      } as Request;

      await adminController.updateUserPlan(
        updateRequest,
        mockResponse as Response,
        db,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(responseObject).toHaveProperty(
        'message',
        'Plan updated successfully',
      );

      // Verify update
      const getRequest = {
        ...mockRequest,
        params: {userId: 'test-user-123'},
      } as Request;

      await adminController.getUser(getRequest, mockResponse as Response, db);

      expect(responseObject).toMatchObject({
        id: 'test-user-123',
        plan: SubscriptionTier.PRO,
      });
    });

    it('should handle invalid subscription updates', async () => {
      const updateRequest = {
        ...mockRequest,
        params: {userId: 'non-existent-id'},
        body: {
          plan: SubscriptionTier.PRO,
        },
      } as Request;

      await adminController.updateUserPlan(
        updateRequest,
        mockResponse as Response,
        db,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(responseObject).toHaveProperty('error');
    });
  });
});
