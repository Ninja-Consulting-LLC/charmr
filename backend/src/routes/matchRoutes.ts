import express from 'express';
import {
  addMatch,
  deleteMatch,
  getMatches,
  hideMatch,
  restoreMatch,
  updateMatchLastUsed,
} from '../controllers/matchController';
import {getMessageRepository} from '../db/repositories';
import {Database} from '../db/types';
import {authenticateUser} from '../middleware/auth';
import {SubscriptionTier} from '../types/enums';
import {loadConversation} from '../utils/conversationUtils';

const createMatchRouter = (db: Database) => {
  const router = express.Router();

  // Helper to get user ID from either Firebase token or anonymous user ID
  const getUserFromRequest = (req: express.Request) => {
    // If using Firebase token, get user ID from token
    if (req.headers.authorization?.startsWith('Bearer ')) {
      // For now, since we're in development, just use the userId from params
      // TODO: In production, verify the Firebase token and extract the user ID
      return req.params.userId;
    }
    // If using anonymous user ID (installation ID), use that
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
      const messageRepository = getMessageRepository(db);
      // Use the combined timeline (messages + screenshots)
      const timeline = await messageRepository.getConversationTimeline(
        userId,
        matchId,
      );

      // Set headers to prevent caching
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      res.json(timeline);
    } catch (error) {
      console.error('Error fetching match messages:', error);
      res.status(500).json({error: 'Failed to fetch match messages'});
    }
  });

  // Add a new match
  router.post('/users/:userId/matches', async (req, res) => {
    const userId = getUserFromRequest(req);
    if (userId !== req.params.userId) {
      return res.status(403).json({error: 'Unauthorized access to user data'});
    }
    const match = await addMatch(db, {
      userId: req.params.userId,
      name: req.body.name,
      platform: req.body.platform,
    });
    if (match) {
      res.status(201).json(match);
    } else {
      res.status(400).json({error: 'Failed to create match'});
    }
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

  // Debug endpoint: get full conversation for a user/match
  router.get('/debug/conversation/:userId/:matchId', async (req, res) => {
    try {
      const {userId, matchId} = req.params;
      // For debugging, assume admin access
      const conversation = await loadConversation(
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
