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
      const user = await adminController.createUser(db, {
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
        plan: SubscriptionTier.FREE,
      });

      expect(user).toBeTruthy();
      expect(user?.id).toBe('test-user-123');
      expect(user?.email).toBe('test@example.com');
      expect(user?.name).toBe('Test User');
      expect(user?.plan).toBe(SubscriptionTier.FREE);
    });

    it('should handle invalid user data', async () => {
      const user = await adminController.createUser(db, {
        id: 'test-user-123',
        email: '',
        name: '',
        plan: SubscriptionTier.FREE,
      });

      expect(user).toBeTruthy();
      expect(user?.id).toBe('test-user-123');
      expect(user?.email).toBe('');
      expect(user?.name).toBe('');
    });

    it('should prevent duplicate users', async () => {
      // First user
      const user1 = await adminController.createUser(db, {
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
        plan: SubscriptionTier.FREE,
      });

      expect(user1).toBeTruthy();

      // Try to create duplicate
      const user2 = await adminController.createUser(db, {
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
        plan: SubscriptionTier.FREE,
      });

      expect(user2).toBeNull();
    });
  });

  describe('User Profile Updates', () => {
    it('should update user profile correctly', async () => {
      // First create a user
      const user = await adminController.createUser(db, {
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
        plan: SubscriptionTier.FREE,
      });

      expect(user).toBeTruthy();

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
      const user = await adminController.createUser(db, {
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
        plan: SubscriptionTier.FREE,
      });

      expect(user).toBeTruthy();

      // Update subscription
      const updateRequest = {
        ...mockRequest,
        params: {userId: 'test-user-123'},
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
      expect(responseObject).toHaveProperty('error', 'User not found');
    });
  });
});
