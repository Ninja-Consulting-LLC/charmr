import {Request, Response} from 'express';
import {createReplyController} from '../controllers/replyController';
import {getDatabase} from '../db';

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

describe('Reply Controller', () => {
  let db: Awaited<ReturnType<typeof getDatabase>>;
  let replyController: Awaited<ReturnType<typeof createReplyController>>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseObject: any;
  let matchId: string;

  beforeEach(async () => {
    db = await getDatabase();
    await db.clearDatabase();
    replyController = await createReplyController(db);

    await db.createUser({
      id: 'test-user-123',
      email: 'test@example.com',
      name: 'Test User',
    });

    const now = new Date().toISOString();
    const match = await db.addMatch('test-user-123', {
      userId: 'test-user-123',
      name: 'Test Match',
      platform: 'test',
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
        prompt: 'Test reply',
        userId: 'test-user-123',
        matchId,
      },
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
    await db.clearDatabase();
  });

  describe('generateReply', () => {
    it('should generate a reply successfully', async () => {
      await replyController.generateReplyHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(responseObject).toHaveProperty('reply');
      expect(responseObject).toHaveProperty('summary');
    });

    it('should handle missing prompt', async () => {
      mockRequest.body = {
        userId: 'test-user-123',
        matchId,
      };

      await replyController.generateReplyHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(responseObject).toHaveProperty('error');
    });

    it('should handle non-existent match', async () => {
      mockRequest.body = {
        prompt: 'Test reply',
        userId: 'test-user-123',
        matchId: 'non-existent',
      };

      await replyController.generateReplyHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(responseObject).toHaveProperty('error', 'Match not found');
    });
  });
});
