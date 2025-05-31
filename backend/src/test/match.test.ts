import {afterEach, beforeEach, describe, expect, it} from '@jest/globals';
import {Request, Response} from 'express';
import {
  addMatch,
  deleteMatch,
  getMatches,
  hideMatch,
  restoreMatch,
  updateMatchLastUsed,
} from '../controllers/matchController';
import {getDatabase} from '../db';

describe('Match Domain', () => {
  let db: Awaited<ReturnType<typeof getDatabase>>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseObject: any;
  let matchId: string | undefined;

  beforeEach(async () => {
    db = await getDatabase();

    // Clean up any existing test data first
    await db.clearDatabase();

    // Setup mock request
    mockRequest = {
      params: {userId: 'test-user-123'},
      body: {name: 'Test Match', platform: 'test-platform'},
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

    // Create test user
    await db.createUser({
      id: 'test-user-123',
      email: 'test@example.com',
      name: 'Test User',
    });
  });

  afterEach(async () => {
    await db.clearDatabase();
  });

  describe('Match Creation', () => {
    it('should create a new match successfully', async () => {
      await addMatch(mockRequest as Request, mockResponse as Response, db);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(responseObject).toMatchObject({
        name: 'Test Match',
        platform: 'test-platform',
      });

      matchId = responseObject.id;

      // Update last used
      const updateMatchReq = {
        ...mockRequest,
        body: {
          matchId,
        },
      } as Request;

      await updateMatchLastUsed(updateMatchReq, mockResponse as Response, db);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(responseObject).toHaveProperty(
        'message',
        'Match updated successfully',
      );

      // Verify update by getting matches
      const getMatchesReq = {
        ...mockRequest,
        query: {includeHidden: 'true'},
      } as Request;

      await getMatches(getMatchesReq, mockResponse as Response, db);

      expect(responseObject).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: matchId,
            lastUsed: expect.any(String),
          }),
        ]),
      );
    });

    it('should handle invalid match data', async () => {
      mockRequest.body = {
        name: '',
        platform: '',
      };

      await addMatch(mockRequest as Request, mockResponse as Response, db);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(responseObject).toHaveProperty('error');
    });

    it('should prevent duplicate matches', async () => {
      // First match
      await addMatch(mockRequest as Request, mockResponse as Response, db);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      matchId = responseObject.id;

      // Try to create duplicate
      await addMatch(mockRequest as Request, mockResponse as Response, db);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(responseObject).toHaveProperty('error');
    });
  });

  describe('Match Status Updates', () => {
    it('should update match status correctly', async () => {
      // First create a match
      await addMatch(mockRequest as Request, mockResponse as Response, db);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      matchId = responseObject.id;

      // Update last used
      const updateMatchReq = {
        ...mockRequest,
        body: {
          matchId,
        },
      } as Request;

      await updateMatchLastUsed(updateMatchReq, mockResponse as Response, db);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(responseObject).toHaveProperty(
        'message',
        'Match updated successfully',
      );

      // Verify update by getting matches
      const getMatchesReq = {
        ...mockRequest,
        query: {includeHidden: 'true'},
      } as Request;

      await getMatches(getMatchesReq, mockResponse as Response, db);

      expect(responseObject).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: matchId,
            lastUsed: expect.any(String),
          }),
        ]),
      );
    });

    it('should handle invalid status transitions', async () => {
      const updateMatchReq = {
        ...mockRequest,
        body: {
          matchId: 'non-existent-id',
        },
      } as Request;

      await updateMatchLastUsed(updateMatchReq, mockResponse as Response, db);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(responseObject).toHaveProperty('error', 'Match not found');
    });
  });

  describe('Match Interactions', () => {
    it('should process match interactions correctly', async () => {
      // First create a match
      await addMatch(mockRequest as Request, mockResponse as Response, db);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      matchId = responseObject.id;

      // Get matches
      const getMatchesReq = {
        ...mockRequest,
        query: {includeHidden: 'true'},
      } as Request;

      await getMatches(getMatchesReq, mockResponse as Response, db);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(responseObject).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: matchId,
            name: 'Test Match',
            platform: 'test-platform',
          }),
        ]),
      );
    });

    it('should handle interaction errors gracefully', async () => {
      const getMatchesReq = {
        ...mockRequest,
        params: {userId: 'non-existent-user'},
        query: {includeHidden: 'true'},
      } as Request;

      await getMatches(getMatchesReq, mockResponse as Response, db);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(responseObject).toHaveProperty('error', 'User not found');
    });
  });
});

describe('Match Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let db: Awaited<ReturnType<typeof getDatabase>>;

  beforeEach(async () => {
    db = await getDatabase();
    mockReq = {
      params: {},
      body: {},
      user: {id: 'test-user'},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  afterEach(async () => {
    await db.clearDatabase();
  });

  describe('getMatches', () => {
    it('should return 404 if user not found', async () => {
      mockReq.params = {userId: 'non-existent'};
      await getMatches(mockReq as Request, mockRes as Response, db);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({error: 'User not found'});
    });

    it('should return matches for a user', async () => {
      // Create a test user
      await db.createUser({
        id: 'test-user',
        email: 'test@example.com',
        name: 'Test User',
      });

      // Add a test match
      const match = await db.addMatch('test-user', {
        userId: 'test-user',
        name: 'Test Match',
        platform: 'test',
        lastUsed: new Date().toISOString(),
        hidden: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      mockReq.params = {userId: 'test-user'};
      await getMatches(mockReq as Request, mockRes as Response, db);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      const responseData = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(responseData).toEqual([match]);
    });
  });

  describe('addMatch', () => {
    it('should return 401 if not authenticated', async () => {
      mockReq.user = undefined;
      await addMatch(mockReq as Request, mockRes as Response, db);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({error: 'Unauthorized'});
    });

    it('should return 400 if name or platform is missing', async () => {
      mockReq.body = {};
      await addMatch(mockReq as Request, mockRes as Response, db);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Name and platform are required',
      });
    });

    it('should add a match successfully', async () => {
      mockReq.body = {
        name: 'Test Match',
        platform: 'test',
      };

      await addMatch(mockReq as Request, mockRes as Response, db);
      const responseData = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(responseData).toMatchObject({
        name: 'Test Match',
        platform: 'test',
      });
    });
  });

  describe('updateMatchLastUsed', () => {
    it('should return 404 if user not found', async () => {
      mockReq.params = {userId: 'non-existent'};
      mockReq.body = {matchId: '123'};
      await updateMatchLastUsed(mockReq as Request, mockRes as Response, db);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({error: 'User not found'});
    });

    it('should update match last used successfully', async () => {
      // Create a test user
      await db.createUser({
        id: 'test-user',
        email: 'test@example.com',
        name: 'Test User',
      });

      // Add a test match
      const match = await db.addMatch('test-user', {
        userId: 'test-user',
        name: 'Test Match',
        platform: 'test',
        lastUsed: new Date().toISOString(),
        hidden: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      mockReq.params = {userId: 'test-user'};
      mockReq.body = {matchId: match.id.toString()};
      await updateMatchLastUsed(mockReq as Request, mockRes as Response, db);
      const responseData = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(responseData).toEqual({
        message: 'Match updated successfully',
      });
    });
  });

  describe('deleteMatch', () => {
    it('should return 404 if user not found', async () => {
      mockReq.params = {userId: 'non-existent', matchId: '123'};
      await deleteMatch(mockReq as Request, mockRes as Response, db);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({error: 'User not found'});
    });

    it('should delete match successfully', async () => {
      // Create a test user
      await db.createUser({
        id: 'test-user',
        email: 'test@example.com',
        name: 'Test User',
      });

      // Add a test match
      const match = await db.addMatch('test-user', {
        userId: 'test-user',
        name: 'Test Match',
        platform: 'test',
        lastUsed: new Date().toISOString(),
        hidden: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      mockReq.params = {
        userId: 'test-user',
        matchId: match.id.toString(),
      };
      await deleteMatch(mockReq as Request, mockRes as Response, db);
      const responseData = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(responseData).toEqual({
        message: 'Match deleted successfully',
      });
    });
  });

  describe('hideMatch', () => {
    it('should return 404 if user not found', async () => {
      mockReq.params = {userId: 'non-existent'};
      mockReq.body = {matchId: '123'};
      await hideMatch(mockReq as Request, mockRes as Response, db);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({error: 'User not found'});
    });

    it('should hide match successfully', async () => {
      // Create a test user
      await db.createUser({
        id: 'test-user',
        email: 'test@example.com',
        name: 'Test User',
      });

      // Add a test match
      const match = await db.addMatch('test-user', {
        userId: 'test-user',
        name: 'Test Match',
        platform: 'test',
        lastUsed: new Date().toISOString(),
        hidden: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      mockReq.params = {userId: 'test-user'};
      mockReq.body = {matchId: match.id.toString()};
      await hideMatch(mockReq as Request, mockRes as Response, db);
      const responseData = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(responseData).toEqual({
        message: 'Match hidden successfully',
      });
    });
  });

  describe('restoreMatch', () => {
    it('should return 404 if user not found', async () => {
      mockReq.params = {userId: 'non-existent'};
      mockReq.body = {matchId: '123'};
      await restoreMatch(mockReq as Request, mockRes as Response, db);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({error: 'User not found'});
    });

    it('should restore match successfully', async () => {
      // Create a test user
      await db.createUser({
        id: 'test-user',
        email: 'test@example.com',
        name: 'Test User',
      });

      // Add a test match
      const match = await db.addMatch('test-user', {
        userId: 'test-user',
        name: 'Test Match',
        platform: 'test',
        lastUsed: new Date().toISOString(),
        hidden: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      mockReq.params = {userId: 'test-user'};
      mockReq.body = {matchId: match.id.toString()};
      await restoreMatch(mockReq as Request, mockRes as Response, db);
      const responseData = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(responseData).toEqual({
        message: 'Match restored successfully',
      });
    });
  });
});
