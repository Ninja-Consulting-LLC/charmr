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

  // Apply authentication middleware to all routes
  router.use(authenticateUser);

  // Get all matches for a user
  router.get('/matches/:userId', (req, res) => getMatches(req, res, db));

  // Add a new match
  router.post('/users/:userId/matches', (req, res) => addMatch(req, res, db));

  // Update match last used
  router.put('/users/:userId/matches/last-used', (req, res) =>
    updateMatchLastUsed(req, res, db),
  );

  // Delete a match
  router.delete('/users/:userId/matches', (req, res) =>
    deleteMatch(req, res, db),
  );

  // Hide a match
  router.put('/users/:userId/matches/hide', (req, res) =>
    hideMatch(req, res, db),
  );

  // Restore a hidden match
  router.put('/users/:userId/matches/restore', (req, res) =>
    restoreMatch(req, res, db),
  );

  return router;
};

export default createMatchRouter;
