import {Request, Response} from 'express';
import {createReplyController} from '../controllers/replyController';
import {getDatabase} from '../db';

describe('Reply Controller', () => {
  let db: Awaited<ReturnType<typeof getDatabase>>;
  let replyController: Awaited<ReturnType<typeof createReplyController>>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseObject: any;

  beforeEach(async () => {
    db = await getDatabase();
    await db.clearDatabase();
    replyController = await createReplyController(db);

    // Setup mock request
    mockRequest = {
      params: {userId: 'test-user-123', matchId: 'test-match-123'},
      body: {
        prompt: 'Test reply',
        userId: 'test-user-123',
        matchId: 'test-match-123',
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

    // Create test user and match
    await db.createUser({
      id: 'test-user-123',
      email: 'test@example.com',
      name: 'Test User',
    });

    await db.addMatch('test-user-123', {
      userId: 'test-user-123',
      name: 'Test Match',
      platform: 'test',
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
        matchId: 'test-match-123',
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
