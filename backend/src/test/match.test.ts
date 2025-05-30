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
  let matchId: string | undefined;

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

    // Create test user
    const user = await createUser(db, {
      id: 'test-user-123',
      email: 'test@example.com',
      name: 'Test User',
      plan: SubscriptionTier.PRO,
    });

    if (!user) {
      throw new Error('Failed to create test user');
    }
  });

  afterEach(async () => {
    // Clean up test data
    await db.run('DELETE FROM matches WHERE userId = ?', 'test-user-123');
    await db.run('DELETE FROM users WHERE id = ?', 'test-user-123');
  });

  describe('Match Creation', () => {
    it('should create a new match successfully', async () => {
      const match = await addMatch(db, {
        userId: 'test-user-123',
        name: 'Test Match',
        platform: 'test-platform',
      });

      expect(match).toBeTruthy();
      expect(match?.id).toBeTruthy();
      matchId = match?.id.toString() || '';

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
      const match = await addMatch(db, {
        userId: 'test-user-123',
        name: '',
        platform: '',
      });

      expect(match).toBeNull();
    });

    it('should prevent duplicate matches', async () => {
      // First match
      const match = await addMatch(db, {
        userId: 'test-user-123',
        name: 'Test Match',
        platform: 'test-platform',
      });

      expect(match).toBeTruthy();
      matchId = match?.id.toString() || '';

      // Try to create duplicate
      const duplicateMatch = await addMatch(db, {
        userId: 'test-user-123',
        name: 'Test Match',
        platform: 'test-platform',
      });

      expect(duplicateMatch).toBeNull();
    });
  });

  describe('Match Status Updates', () => {
    it('should update match status correctly', async () => {
      // First create a match
      const match = await addMatch(db, {
        userId: 'test-user-123',
        name: 'Test Match',
        platform: 'test-platform',
      });

      expect(match).toBeTruthy();
      matchId = match?.id.toString() || '';

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
      const match = await addMatch(db, {
        userId: 'test-user-123',
        name: 'Test Match',
        platform: 'test-platform',
      });

      expect(match).toBeTruthy();
      matchId = match?.id.toString() || '';

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
