import express from 'express';
import {
  addMatch,
  deleteMatch,
  getMatches,
  hideMatch,
  restoreMatch,
  updateMatch,
  updateMatchLastUsed,
} from '../controllers/matchController';
import {getMessageRepository} from '../db/repositories';
import {Database} from '../db/types';
import {authenticateUser} from '../middleware/auth';
import {SubscriptionTier} from '../types/enums';
import {loadConversation} from '../utils/conversationUtils';
import logger from '../utils/logger';

const createMatchRouter = (db: Database) => {
  const router = express.Router();

  /**
   * Resolves the authenticated principal. Never trusts `:userId` from the URL unless
   * `CHARMR_DEV_INSECURE_MATCH_USER_ID=1` and `NODE_ENV !== 'production'` (local E2E only).
   */
  const getUserFromRequest = (req: express.Request) => {
    const devOverride =
      process.env.CHARMR_DEV_INSECURE_MATCH_USER_ID === '1' &&
      process.env.NODE_ENV !== 'production';
    if (devOverride) {
      return req.params.userId;
    }

    if (req.headers.authorization?.startsWith('Bearer ')) {
      return req.user?.uid;
    }
    const anonymousUserId = req.headers['x-anonymous-user'] as string;
    if (!anonymousUserId) {
      throw new Error('No user ID found in request');
    }
    return anonymousUserId;
  };

  // Apply authentication middleware to all routes
  router.use(authenticateUser);

  // Get all matches for a user
  router.get('/users/:userId/matches', (req, res) => {
    const userId = getUserFromRequest(req);
    if (userId !== req.params.userId) {
      return res.status(403).json({error: 'Unauthorized access to user data'});
    }
    return getMatches(req, res, db);
  });

  // Get messages for a specific match
  router.get('/users/:userId/matches/:matchId/messages', async (req, res) => {
    try {
      const userId = getUserFromRequest(req);
      if (userId !== req.params.userId) {
        return res
          .status(403)
          .json({error: 'Unauthorized access to user data'});
      }

      const {matchId} = req.params;
      const {limit, offset} = req.query;

      logger.debug('[Backend] Loading messages for match:', {
        userId,
        matchId,
        limit,
        offset,
      });

      const messageRepository = getMessageRepository(db);
      const {messages, total} = await messageRepository.getMessagesByMatch(
        userId,
        matchId,
        undefined, // No additional filters needed since system messages are excluded in the query
        limit && offset
          ? {
              limit: parseInt(limit as string, 10),
              offset: parseInt(offset as string, 10),
            }
          : undefined,
      );

      logger.debug('[Backend] Retrieved messages:', {
        userId,
        matchId,
        totalMessages: total,
        returnedMessages: messages.length,
        messageIds: messages.map(m => m.id),
      });

      // Set headers to prevent caching
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      res.json({
        messages,
        total,
      });
    } catch (error) {
      logger.error('[Backend] Error fetching match messages', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      res.status(500).json({error: 'Failed to fetch match messages'});
    }
  });

  // Add a new match
  router.post('/users/:userId/matches', async (req, res) => {
    const userId = getUserFromRequest(req);
    if (userId !== req.params.userId) {
      return res.status(403).json({error: 'Unauthorized access to user data'});
    }
    return addMatch(req, res, db);
  });

  // Update match last used
  router.put('/users/:userId/matches/last-used', (req, res) => {
    const userId = getUserFromRequest(req);
    if (userId !== req.params.userId) {
      return res.status(403).json({error: 'Unauthorized access to user data'});
    }
    return updateMatchLastUsed(req, res, db);
  });

  // Delete a match (RESTful)
  router.delete('/users/:userId/matches/:matchId', (req, res) => {
    const userId = getUserFromRequest(req);
    if (userId !== req.params.userId) {
      return res.status(403).json({error: 'Unauthorized access to user data'});
    }
    return deleteMatch(req, res, db);
  });

  // Hide a match
  router.put('/users/:userId/matches/hide', (req, res) => {
    const userId = getUserFromRequest(req);
    if (userId !== req.params.userId) {
      return res.status(403).json({error: 'Unauthorized access to user data'});
    }
    return hideMatch(req, res, db);
  });

  // Restore a hidden match
  router.put('/users/:userId/matches/restore', (req, res) => {
    const userId = getUserFromRequest(req);
    if (userId !== req.params.userId) {
      return res.status(403).json({error: 'Unauthorized access to user data'});
    }
    return restoreMatch(req, res, db);
  });

  // Update a match
  router.put('/users/:userId/matches/:matchId', (req, res) => {
    const userId = getUserFromRequest(req);
    if (userId !== req.params.userId) {
      return res.status(403).json({error: 'Unauthorized access to user data'});
    }
    return updateMatch(req, res, db);
  });

  // Debug endpoint: get full conversation for a user/match (non-production only)
  router.get('/debug/conversation/:userId/:matchId', async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).end();
    }
    try {
      const {userId, matchId} = req.params;
      // For debugging, assume admin access
      const conversation = await loadConversation(
        db,
        userId,
        matchId,
        SubscriptionTier.FREE,
      );
      res.json(conversation);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to load conversation',
        details: error instanceof Error ? error.message : error,
      });
    }
  });

  return router;
};

export default createMatchRouter;
