import express from 'express';
import {
  addMatch,
  deleteMatch,
  getMatches,
  hideMatch,
  restoreMatch,
  updateMatchLastUsed,
} from '../controllers/matchController';
import {Database} from '../db/types';
import {authenticateUser} from '../middleware/auth';

const createMatchRouter = (db: Database) => {
  const router = express.Router();

  // Helper to get user ID from either Firebase token or anonymous user ID
  const getUserFromRequest = (req: express.Request) => {
    // If using Firebase token, get user ID from token
    if (req.headers.authorization?.startsWith('Bearer ')) {
      // TODO: Extract user ID from Firebase token
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

  // Add a new match
  router.post('/users/:userId/matches', (req, res) => {
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

  // Delete a match
  router.delete('/users/:userId/matches', (req, res) => {
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

  return router;
};

export default createMatchRouter;
