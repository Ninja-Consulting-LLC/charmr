import {Router} from 'express';
import {
  addMatch,
  deleteMatch,
  getMatches,
  hideMatch,
  restoreMatch,
  updateMatchLastUsed,
} from '../controllers/matchController';
import {authenticateUser} from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateUser);

// Get matches for a user
router.get('/users/:userId/matches', getMatches);

// Add a new match
router.post('/users/:userId/matches', addMatch);

// Update match last used
router.put('/users/:userId/matches/last-used', updateMatchLastUsed);

// Delete a match
router.delete('/users/:userId/matches', deleteMatch);

// Hide a match
router.put('/users/:userId/matches/hide', hideMatch);

// Restore a hidden match
router.put('/users/:userId/matches/restore', restoreMatch);

export default router;
