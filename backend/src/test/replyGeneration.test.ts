import {afterEach, beforeEach, describe, expect, it} from '@jest/globals';
import {Request, Response} from 'express';
import * as fs from 'fs';
import * as path from 'path';
import {createReplyController} from '../controllers/replyController';
import {getDatabase} from '../db';
import {SubscriptionTier} from '../types/enums';

const mockSubscriptionTier = SubscriptionTier;

// Mock Firebase Admin SDK
jest.mock('../config/firebase-admin', () => ({
  firebaseAdmin: {
    auth: () => ({
      verifyIdToken: jest.fn().mockResolvedValue({
        uid: 'test-user-123',
        email: 'test@example.com',
      }),
    }),
    firestore: () => ({
      collection: jest.fn().mockReturnThis(),
      doc: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({
          email: 'test@example.com',
          name: 'Test User',
          plan: mockSubscriptionTier.PRO,
        }),
        docs: [],
        empty: true,
      }),
      set: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      batch: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        commit: jest.fn().mockResolvedValue(undefined),
      }),
      add: jest.fn().mockResolvedValue({
        id: 'mock-id',
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({id: 'mock-id'}),
        }),
      }),
      count: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({
          data: () => ({count: 0}),
        }),
      }),
    }),
    initializeApp: jest.fn(),
  },
}));

describe('Reply Generation Integration', () => {
  let db: Awaited<ReturnType<typeof getDatabase>>;
  let replyController: Awaited<ReturnType<typeof createReplyController>>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseObject: any;
  let testImagePath: string;

  beforeEach(async () => {
    db = await getDatabase();
    await db.clearDatabase();
    replyController = await createReplyController(db);

    // Setup test image path
    testImagePath = path.join(
      __dirname,
      '../../../assets/dating_screenshots/dating-converastion.PNG',
    );

    // Verify test image exists
    if (!fs.existsSync(testImagePath)) {
      throw new Error(`Test image not found at ${testImagePath}`);
    }

    // Read image file and convert to base64
    const imageBuffer = fs.readFileSync(testImagePath);
    const base64Image = `data:image/png;base64,${imageBuffer.toString(
      'base64',
    )}`;

    // Setup mock request
    mockRequest = {
      params: {userId: 'test-user-123', matchId: 'test-match-123'},
      body: {
        userId: 'test-user-123',
        matchId: 'test-match-123',
        images: [base64Image],
        match: {
          name: 'Sarah',
          age: 28,
          bio: 'Love hiking, photography, and trying new restaurants. Looking for someone who shares similar interests and values meaningful connections.',
          platform: 'tinder',
        },
        skipRateLimiting: true,
      },
      headers: {
        authorization: 'Bearer test-token',
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
    };

    // Create test user
    await db.createUser({
      id: 'test-user-123',
      email: 'test@example.com',
      name: 'Test User',
      plan: SubscriptionTier.PRO,
    });

    // Create test match
    await db.addMatch('test-user-123', {
      userId: 'test-user-123',
      name: 'Sarah',
      platform: 'tinder',
      lastUsed: new Date().toISOString(),
      hidden: false,
      deleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  afterEach(async () => {
    await db.clearDatabase();
  });

  describe('POST /api/generate-reply', () => {
    it('should generate a valid reply from screenshot', async () => {
      // Call the reply generation endpoint
      await replyController.generateReplyHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      // Verify response status
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      // Verify response structure
      expect(responseObject).toHaveProperty('reply');
      expect(responseObject).toHaveProperty('summary');

      // Verify reply is non-empty
      expect(responseObject.reply).toBeTruthy();
      expect(typeof responseObject.reply).toBe('string');
      expect(responseObject.reply.length).toBeGreaterThan(0);
      expect(responseObject.reply.length).toBeLessThanOrEqual(300);

      // Verify summary is non-empty
      expect(responseObject.summary).toBeTruthy();
      expect(typeof responseObject.summary).toBe('string');
      expect(responseObject.summary.length).toBeGreaterThan(0);
    });

    it('should handle missing screenshot', async () => {
      // Remove images from request
      mockRequest.body.images = [];
      mockRequest.body.skipRateLimiting = true;

      // Call the reply generation endpoint
      await replyController.generateReplyHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      // Verify error response
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(responseObject).toHaveProperty('error');
    });

    it('should handle imageOnly (no match)', async () => {
      // Remove match context from request
      delete mockRequest.body.match;
      mockRequest.body.skipRateLimiting = true;

      // Call the reply generation endpoint
      await replyController.generateReplyHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      // Verify response status
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(responseObject).toHaveProperty('reply');
      expect(responseObject).toHaveProperty('summary');
    });

    it('should handle match with image only', async () => {
      // Remove prompt from request
      delete mockRequest.body.prompt;
      mockRequest.body.skipRateLimiting = true;

      // Call the reply generation endpoint
      await replyController.generateReplyHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      // Verify response status
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(responseObject).toHaveProperty('reply');
      expect(responseObject).toHaveProperty('summary');
    });

    it('should handle match with image and prompt', async () => {
      // Add prompt to request
      mockRequest.body.prompt = 'Test prompt';
      mockRequest.body.skipRateLimiting = true;

      // Call the reply generation endpoint
      await replyController.generateReplyHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      // Verify response status
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(responseObject).toHaveProperty('reply');
      expect(responseObject).toHaveProperty('summary');
    });

    it('should handle coach with image only', async () => {
      // Set mode to coach and remove prompt
      mockRequest.body.mode = 'coach';
      delete mockRequest.body.prompt;
      mockRequest.body.skipRateLimiting = true;

      try {
        // Call the reply generation endpoint
        await replyController.generateReplyHandler(
          mockRequest as Request,
          mockResponse as Response,
        );

        // Verify response status
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(responseObject).toHaveProperty('reply');
        expect(responseObject).toHaveProperty('summary');
      } catch (error) {
        console.error('OpenAI API error:', error);
        throw error;
      }
    }, 30000);

    it('should handle coach with image and prompt', async () => {
      // Set mode to coach and add prompt
      mockRequest.body.mode = 'coach';
      mockRequest.body.prompt = 'Test prompt';
      mockRequest.body.skipRateLimiting = true;

      try {
        // Call the reply generation endpoint
        await replyController.generateReplyHandler(
          mockRequest as Request,
          mockResponse as Response,
        );

        // Verify response status
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(responseObject).toHaveProperty('reply');
        expect(responseObject).toHaveProperty('summary');
      } catch (error) {
        console.error('OpenAI API error:', error);
        throw error;
      }
    }, 30000);

    it('should handle coach with prompt only', async () => {
      // Set mode to coach, remove images, and add prompt
      mockRequest.body.mode = 'coach';
      mockRequest.body.images = [];
      mockRequest.body.prompt = 'Test prompt';
      mockRequest.body.skipRateLimiting = true;

      try {
        // Call the reply generation endpoint
        await replyController.generateReplyHandler(
          mockRequest as Request,
          mockResponse as Response,
        );

        // Verify response status
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(responseObject).toHaveProperty('reply');
        expect(responseObject).toHaveProperty('summary');
      } catch (error) {
        console.error('OpenAI API error:', error);
        throw error;
      }
    }, 30000);
  });
});
