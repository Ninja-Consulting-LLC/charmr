import {Request, Response} from 'express';
import {createUser} from '../controllers/adminController';
import {addMatch} from '../controllers/matchController';
import {createReplyController} from '../controllers/replyController';
import {getDatabase} from '../db';
import {SubscriptionTier} from '../types/enums';

// Mock the AI services
jest.mock('../services/openaiService', () => {
  let testDb: any;
  return {
    __setTestDb: (db: any) => {
      testDb = db;
    },
    createOpenAIService: () => ({
      generateReply: jest.fn(async function ({prompt, userId, matchId}) {
        // Use the testDb instance if set, otherwise fallback
        const db = testDb || (await require('../db').getDatabase());
        // Save system message (summary)
        await db.run(
          'INSERT INTO messages (userId, matchId, role, content, timestamp) VALUES (?, ?, ?, ?, ?)',
          [
            userId,
            matchId,
            'system',
            'Mocked summary',
            new Date().toISOString(),
          ],
        );
        // Save assistant message (reply)
        await db.run(
          'INSERT INTO messages (userId, matchId, role, content, timestamp) VALUES (?, ?, ?, ?, ?)',
          [
            userId,
            matchId,
            'assistant',
            'Mocked reply',
            new Date().toISOString(),
          ],
        );
        return {
          reply: 'Mocked reply',
          summary: 'Mocked summary',
          usage: {total_tokens: 100},
        };
      }),
    }),
  };
});

jest.mock('../services/geminiService', () => ({
  createGeminiService: () => ({
    generateReply: jest.fn().mockResolvedValue({
      reply: 'Mocked reply',
      summary: 'Mocked summary',
      usage: {total_tokens: 100},
    }),
  }),
}));

describe('Reply Controller', () => {
  let replyController: Awaited<ReturnType<typeof createReplyController>>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let db: any;
  let matchId: number;

  beforeEach(async () => {
    db = await getDatabase();
    require('../services/openaiService').__setTestDb(db);

    // Clean up any existing test data first
    await db.run('DELETE FROM messages WHERE userId = ?', 'test-user-123');
    await db.run('DELETE FROM matches WHERE userId = ?', 'test-user-123');
    await db.run('DELETE FROM users WHERE id = ?', 'test-user-123');

    // Create test user using controller
    const createUserReq: Partial<Request> = {
      body: {
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
        plan: SubscriptionTier.FREE,
        installationId: 'test-installation-123',
      },
      headers: {},
      cookies: {},
    };
    const createUserRes: Partial<Response> = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
    };
    await createUser(createUserReq as Request, createUserRes as Response, db);

    // Create test match using controller
    const addMatchReq: Partial<Request> = {
      params: {userId: 'test-user-123'},
      body: {name: 'Test Match', platform: 'tinder'},
    };
    const addMatchRes: Partial<Response> = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockImplementation(result => {
        matchId = result.id;
        return addMatchRes;
      }),
      setHeader: jest.fn(),
    };
    await addMatch(addMatchReq as Request, addMatchRes as Response, db);

    // Add a small delay to ensure match is committed
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify match was created
    const match = await db.getMatchById(String(matchId));
    if (!match) {
      throw new Error('Failed to create test match');
    }

    replyController = createReplyController(db);

    mockRequest = {
      body: {
        prompt: 'Hello, how are you?',
        matchId: String(matchId),
        userId: 'test-user-123',
      },
      app: {
        locals: {
          user: {
            id: 'test-user-123',
            plan: SubscriptionTier.FREE,
          },
        },
      } as any,
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  afterEach(async () => {
    // Clean up test data
    await db.run('DELETE FROM messages WHERE userId = ?', 'test-user-123');
    await db.run('DELETE FROM matches WHERE userId = ?', 'test-user-123');
    await db.run('DELETE FROM users WHERE id = ?', 'test-user-123');
    jest.clearAllMocks();
  });

  describe('Message Processing', () => {
    it.skip('should process a new message successfully', async () => {
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

    it.skip('should validate message content', async () => {
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

    it.skip('should handle message errors gracefully', async () => {
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
    it.skip('should generate appropriate replies', async () => {
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

    it.skip('should maintain conversation context', async () => {
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
    it.skip('should track conversation state', async () => {
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
      expect(messages[0].content).toBeTruthy();
      expect(messages[1].content).toBeTruthy();
    });

    it.skip('should handle conversation timeouts', async () => {
      // Skipped due to limitations in reliably testing async timeouts in Jest/Node
    });
  });
});
