import {Request, Response} from 'express';
import {createUser} from '../controllers/adminController';
import {addMatch} from '../controllers/matchController';
import {createReplyController} from '../controllers/replyController';
import {getDatabase} from '../db';
import {SubscriptionTier} from '../types/enums';

// Mock the AI services
jest.mock('../services/openaiService', () => ({
  createOpenAIService: () => ({
    generateReply: jest.fn().mockResolvedValue({
      reply: 'Mocked reply',
      summary: 'Mocked summary',
      usage: {total_tokens: 100},
    }),
  }),
}));

describe('Reply Controller', () => {
  let db: any;
  let replyController: any;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let matchId: string;

  beforeEach(async () => {
    db = await getDatabase();
    replyController = await createReplyController(db);

    // Create a test user
    const user = await createUser(db, {
      id: 'test-user-123',
      email: 'test@example.com',
      name: 'Test User',
      plan: SubscriptionTier.FREE,
    });

    if (!user) {
      throw new Error('Failed to create test user');
    }

    // Create a test match
    const match = await addMatch(db, {
      userId: user.id,
      name: 'Test Match',
      platform: 'test',
    });

    if (!match) {
      throw new Error('Failed to create test match');
    }

    matchId = match.id.toString();

    // Initialize mock request and response
    mockRequest = {
      body: {
        prompt: 'Hello',
        userId: user.id,
        matchId: matchId,
      },
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  it('should generate a reply', async () => {
    await replyController.generateReplyHandler(
      mockRequest as Request,
      mockResponse as Response,
    );

    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        reply: expect.any(String),
        summary: expect.any(String),
      }),
    );
  });

  describe('Message Processing', () => {
    it('should process a new message successfully', async () => {
      await replyController.generateReplyHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          reply: expect.any(String),
          summary: expect.any(String),
          usage: expect.any(Object),
          limits: expect.any(Object),
        }),
      );
    });

    it('should validate message content', async () => {
      mockRequest.body = {
        prompt: '',
        matchId: matchId,
        userId: 'test-user-123',
      };

      await replyController.generateReplyHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
        }),
      );
    });

    it('should handle message errors gracefully', async () => {
      mockRequest.body = {
        prompt: 'Hello',
        matchId: 'non-existent-match',
        userId: 'test-user-123',
      };

      await replyController.generateReplyHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
        }),
      );
    });
  });

  describe('Reply Generation', () => {
    it('should generate appropriate replies', async () => {
      await replyController.generateReplyHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          reply: expect.any(String),
          summary: expect.any(String),
          usage: expect.any(Object),
          limits: expect.any(Object),
        }),
      );
    });

    it('should maintain conversation context', async () => {
      // Send first message
      await replyController.generateReplyHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      // Send follow-up message
      mockRequest.body = {
        prompt: 'That sounds great!',
        matchId: matchId,
        userId: 'test-user-123',
      };

      await replyController.generateReplyHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          reply: expect.any(String),
          summary: expect.any(String),
          usage: expect.any(Object),
          limits: expect.any(Object),
        }),
      );
    });
  });

  describe('Conversation Management', () => {
    it('should track conversation state', async () => {
      await replyController.generateReplyHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      // Add a small delay to ensure messages are committed
      await new Promise(resolve => setTimeout(resolve, 100));

      const messages = await db.all(
        'SELECT * FROM messages WHERE matchId = ? ORDER BY timestamp ASC',
        [matchId],
      );

      expect(messages).toHaveLength(2); // System message and AI reply
      expect(messages[0].role).toBe('system');
      expect(messages[1].role).toBe('assistant');
    });
  });
});
