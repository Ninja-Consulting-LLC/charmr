import {afterEach, beforeEach, describe, expect, it} from '@jest/globals';
import {Request, Response} from 'express';
import {createUser} from '../controllers/adminController';
import {
  addMatch,
  getMatches,
  updateMatchLastUsed,
} from '../controllers/matchController';
import {getDatabase} from '../db';
import {SubscriptionTier} from '../types/enums';

describe('Match Domain', () => {
  let db: any;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseObject: any;
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

    // Create test user using controller
    const createUserReq: Partial<Request> = {
      body: {
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
        plan: SubscriptionTier.PRO,
      },
      headers: {},
      cookies: {},
    };
    const createUserRes: Partial<Response> = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    await createUser(createUserReq as Request, createUserRes as Response, db);
  });

  afterEach(async () => {
    // Clean up test data
    await db.run('DELETE FROM matches WHERE userId = ?', 'test-user-123');
    await db.run('DELETE FROM users WHERE id = ?', 'test-user-123');
  });

  describe('Match Creation', () => {
    it('should create a new match successfully', async () => {
      const addMatchReq = {
        ...mockRequest,
        body: {
          name: 'Test Match',
          platform: 'test-platform',
        },
      } as Request;

      await addMatch(addMatchReq, mockResponse as Response, db);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(responseObject).toHaveProperty('id');
      matchId = responseObject.id;
    });

    it('should handle invalid match data', async () => {
      const addMatchReq = {
        ...mockRequest,
        body: {
          name: '',
          platform: '',
        },
      } as Request;

      await addMatch(addMatchReq, mockResponse as Response, db);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(responseObject).toHaveProperty('error');
    });

    it('should prevent duplicate matches', async () => {
      // First match
      const addMatchReq = {
        ...mockRequest,
        body: {
          name: 'Test Match',
          platform: 'test-platform',
        },
      } as Request;

      await addMatch(addMatchReq, mockResponse as Response, db);
      matchId = responseObject.id;

      // Try to create duplicate
      await addMatch(addMatchReq, mockResponse as Response, db);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(responseObject).toHaveProperty('error', 'Match already exists');
    });
  });

  describe('Match Status Updates', () => {
    it('should update match status correctly', async () => {
      // First create a match
      const addMatchReq = {
        ...mockRequest,
        body: {
          name: 'Test Match',
          platform: 'test-platform',
        },
      } as Request;

      await addMatch(addMatchReq, mockResponse as Response, db);
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
      const addMatchReq = {
        ...mockRequest,
        body: {
          name: 'Test Match',
          platform: 'test-platform',
        },
      } as Request;

      await addMatch(addMatchReq, mockResponse as Response, db);
      matchId = responseObject.id;

      // Get matches
      const getMatchesReq = {
        ...mockRequest,
        query: {includeHidden: 'true'},
      } as Request;

      await getMatches(getMatchesReq, mockResponse as Response, db);

      expect(responseObject).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: matchId,
            name: 'Test Match',
            platform: 'test-platform',
            userId: 'test-user-123',
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
