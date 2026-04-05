import {afterEach, beforeEach, describe, expect, it} from '@jest/globals';
import {Request, Response} from 'express';
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

jest.mock('../services/llm/llmProvider', () => ({
  createLlmProvider: jest.fn(() => ({
    generateReply: jest.fn().mockResolvedValue({
      reply: 'Short mock reply for unit test.',
      summary: 'Mock summary of the conversation.',
      error: null as null,
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30,
      },
    }),
  })),
}));

describe('Reply Generation Integration', () => {
  let db: Awaited<ReturnType<typeof getDatabase>>;
  let replyController: Awaited<ReturnType<typeof createReplyController>>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseObject: any;
  let matchId: string;

  /** 1×1 transparent PNG — avoids checked-in binary fixtures in CI. */
  const minimalPngDataUrl =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

  beforeEach(async () => {
    db = await getDatabase();
    await db.clearDatabase();
    replyController = await createReplyController(db);

    await db.createUser({
      id: 'test-user-123',
      email: 'test@example.com',
      name: 'Test User',
      plan: SubscriptionTier.PRO,
    });

    const now = new Date().toISOString();
    const match = await db.addMatch('test-user-123', {
      userId: 'test-user-123',
      name: 'Sarah',
      platform: 'tinder',
      lastUsed: now,
      hidden: false,
      deleted: false,
      createdAt: now,
      updatedAt: now,
    });
    matchId = String(match.id);

    // Setup mock request
    mockRequest = {
      params: {userId: 'test-user-123', matchId},
      body: {
        userId: 'test-user-123',
        matchId,
        images: [minimalPngDataUrl],
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

  describe('CHARMR_E2E_STUB_LLM', () => {
    let prevStub: string | undefined;

    beforeEach(() => {
      prevStub = process.env.CHARMR_E2E_STUB_LLM;
      process.env.CHARMR_E2E_STUB_LLM = 'true';
    });

    afterEach(() => {
      if (prevStub === undefined) {
        delete process.env.CHARMR_E2E_STUB_LLM;
      } else {
        process.env.CHARMR_E2E_STUB_LLM = prevStub;
      }
    });

    it('returns deterministic reply and limits without LLM or image processing', async () => {
      mockRequest.body = {
        userId: 'test-user-123',
        matchId,
        mode: 'coach',
        prompt: 'E2E stub prompt',
        images: [],
        skipRateLimiting: true,
      };

      await replyController.generateReplyHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(responseObject.reply).toBe('[E2E_STUB] Deterministic coach reply');
      expect(responseObject).toMatchObject({
        limits: expect.objectContaining({
          dailyMessagesUsed: expect.any(Number),
          dailyMessageLimit: expect.any(Number),
        }),
        mode: 'coach',
      });
    });
  });
});
