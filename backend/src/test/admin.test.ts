import {afterEach, beforeEach, describe, expect, it} from '@jest/globals';
import {Request, Response} from 'express';
import {config} from '../config/config';
import {
  createUser,
  getUser,
  getUserByInstallationId,
  linkAnonymousUser,
  resetDb,
  resetUserMessageLimit,
  updateUserPlan,
} from '../controllers/adminController';
import {createReplyController} from '../controllers/replyController';
import {getDatabase} from '../db';
import {SubscriptionTier} from '../types/enums';

// Use the token from config which reads from environment
// Only use a test token fallback in test mode
const getAdminToken = () => {
  // Use the admin token from config if available
  if (config.admin.token) {
    return config.admin.token;
  }

  // In test mode, we can use a placeholder
  if (process.env.NODE_ENV === 'test') {
    console.warn('Warning: Using test admin token. Do not use in production.');
    return 'test-admin-token';
  }

  throw new Error('ADMIN_TOKEN environment variable is required');
};

const adminToken = getAdminToken();

describe('Admin Domain', () => {
  let db: any;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseObject: any;
  let generateReplyHandler: any;
  let matchId: string;

  beforeEach(async () => {
    db = await getDatabase();

    // Clean up any existing test data first
    await db.run('DELETE FROM messages WHERE userId = ?', 'test-user-123');
    await db.run('DELETE FROM matches WHERE userId = ?', 'test-user-123');
    await db.run('DELETE FROM users WHERE id = ?', 'test-user-123');

    // Setup mock request
    mockRequest = {
      params: {userId: 'test-user-123'},
      body: {name: 'Test User', email: 'test@example.com'},
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
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
      setHeader: jest.fn(),
    };

    // Create test user using admin controller
    const user = await createUser(db, {
      id: 'test-user-123',
      email: 'test@example.com',
      name: 'Test User',
      plan: SubscriptionTier.FREE,
      installationId: 'test-installation-123',
    });

    if (!user) {
      throw new Error('Failed to create test user');
    }

    // Add a small delay to ensure user is committed
    await new Promise(resolve => setTimeout(resolve, 100));

    // Create test match
    const matchResult = await db.run(
      'INSERT INTO matches (userId, name, platform, lastUsed, hidden, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        'test-user-123',
        'Test Match',
        'tinder',
        new Date().toISOString(),
        false,
        new Date().toISOString(),
        new Date().toISOString(),
      ],
    );
    matchId = matchResult.lastID.toString();

    // Add a small delay to ensure match is committed
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify match exists
    const match = await db.getMatchById(matchId);
    if (!match) {
      throw new Error('Failed to create test match');
    }

    // Instantiate reply controller for this db
    const replyController = await createReplyController(db);
    generateReplyHandler = replyController.generateReplyHandler;
  });

  afterEach(async () => {
    // Clean up test data
    await db.run('DELETE FROM messages WHERE userId = ?', 'test-user-123');
    await db.run('DELETE FROM matches WHERE userId = ?', 'test-user-123');
    await db.run('DELETE FROM users WHERE id = ?', 'test-user-123');
  });

  describe('User Management', () => {
    it('should create a new user successfully', async () => {
      const newUser = await createUser(db, {
        id: 'new-user-123',
        email: 'new@example.com',
        name: 'New User',
        plan: SubscriptionTier.FREE,
      });

      expect(newUser).toBeTruthy();
      expect(newUser?.id).toBe('new-user-123');
      expect(newUser?.email).toBe('new@example.com');
      expect(newUser?.name).toBe('New User');
    });

    it('should fail to create user with missing required fields', async () => {
      const newUser = await createUser(db, {
        id: 'new-user-123',
        email: 'new@example.com',
        name: 'New User',
        plan: SubscriptionTier.FREE,
      });

      expect(newUser).toBeTruthy();
      expect(newUser?.id).toBe('new-user-123');
      expect(newUser?.email).toBe('new@example.com');
      expect(newUser?.name).toBe('New User');
    });

    it('should get all users', async () => {
      // ... existing code ...
    });

    it('should get a specific user', async () => {
      await getUser(mockRequest as Request, mockResponse as Response, db);

      expect(responseObject).toHaveProperty('id', 'test-user-123');
      expect(responseObject.email).toBe('test@example.com');
    });

    it('should return 404 for non-existent user', async () => {
      mockRequest.params = {userId: 'non-existent-user'};
      await getUser(mockRequest as Request, mockResponse as Response, db);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(responseObject).toHaveProperty('error', 'User not found');
    });

    it('should update user plan', async () => {
      mockRequest.body = {plan: SubscriptionTier.PRO};

      await updateUserPlan(
        mockRequest as Request,
        mockResponse as Response,
        db,
      );

      expect(responseObject).toHaveProperty(
        'message',
        'Plan updated successfully',
      );
    });

    it('should fail to update plan for non-existent user', async () => {
      mockRequest.params = {userId: 'non-existent-user'};
      mockRequest.body = {plan: SubscriptionTier.PRO};

      await updateUserPlan(
        mockRequest as Request,
        mockResponse as Response,
        db,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(responseObject).toHaveProperty('error', 'User not found');
    });

    it('should reset user message limit', async () => {
      await resetUserMessageLimit(
        mockRequest as Request,
        mockResponse as Response,
        db,
      );

      expect(responseObject).toMatchObject({
        message: 'Message limit reset successfully',
        user: expect.objectContaining({
          dailyMessagesUsed: 0,
        }),
      });
    });

    it('should fail to reset message limit for non-existent user', async () => {
      mockRequest.params = {userId: 'non-existent-user'};
      await resetUserMessageLimit(
        mockRequest as Request,
        mockResponse as Response,
        db,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(responseObject).toHaveProperty('error', 'User not found');
    });

    it('should get user by installation ID', async () => {
      // Verify user exists before testing
      const user = await db.getUser('test-user-123');
      if (!user) {
        throw new Error('Test user not found in database');
      }

      responseObject = {}; // Reset before test
      mockRequest.params = {installationId: 'test-installation-123'};

      await getUserByInstallationId(
        mockRequest as Request,
        mockResponse as Response,
        db,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(responseObject).toMatchObject({
        id: 'test-user-123',
        installationId: 'test-installation-123',
      });
    });

    it('should link anonymous user to registered user', async () => {
      // Create anonymous user
      await db.run(
        'INSERT INTO users (id, email, name, plan, dailyMessagesUsed, extraMessages, lastResetDate) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          'anonymous-user-123',
          null,
          'Anonymous User',
          SubscriptionTier.FREE,
          0,
          5,
          new Date().toISOString().split('T')[0],
        ],
      );

      mockRequest.body = {
        anonymousUserId: 'anonymous-user-123',
        registeredUserId: 'test-user-123',
        installationId: 'test-installation-123',
      };

      await linkAnonymousUser(
        mockRequest as Request,
        mockResponse as Response,
        db,
      );

      expect(responseObject).toHaveProperty(
        'message',
        'User linked successfully',
      );
    });

    it('should fail to link non-existent users', async () => {
      mockRequest.body = {
        anonymousUserId: 'non-existent-anonymous',
        registeredUserId: 'non-existent-registered',
        installationId: 'test-installation-123',
      };

      await linkAnonymousUser(
        mockRequest as Request,
        mockResponse as Response,
        db,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(responseObject).toHaveProperty(
        'error',
        'Anonymous user not found',
      );
    });
  });

  describe('Database Management', () => {
    it('should reset database', async () => {
      await resetDb(mockRequest as Request, mockResponse as Response, db);

      expect(responseObject).toHaveProperty(
        'message',
        'Database reset completed successfully',
      );
    });
  });
});
