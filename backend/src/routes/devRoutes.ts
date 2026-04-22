import express from 'express';
import {
  checkSchemaHealth,
  getMatchSummary,
  updateMatchSummary,
} from '../controllers/devController';
import {Database} from '../db/types';
import {authenticateUser} from '../middleware/auth';
import {SubscriptionTier} from '../types/enums';
import {getPlanLimits} from '../utils/planLimits';
import logger from '../utils/logger';

const createDevRouter = (db: Database) => {
  const router = express.Router();

  router.get('/schema-health', async (req, res) => {
    await checkSchemaHealth(req, res, db);
  });

  router.get('/matches/:userId/:matchId/summary', async (req, res) => {
    await getMatchSummary(req, res, db);
  });

  router.put('/matches/:userId/:matchId/summary', async (req, res) => {
    await updateMatchSummary(req, res, db);
  });

  router.post(
    '/e2e/saturate-message-limit',
    authenticateUser,
    async (req, res) => {
      try {
        const {userId} = req.body as {userId?: string};
        if (!userId || typeof userId !== 'string') {
          return res.status(400).json({error: 'userId is required'});
        }
        const user = await db.getUser(userId);
        if (!user) {
          return res.status(404).json({error: 'User not found'});
        }
        if (user.plan === SubscriptionTier.PRO) {
          return res
            .status(400)
            .json({error: 'User is PRO; no daily cap to saturate'});
        }
        const limit = getPlanLimits(user.plan);
        const today = new Date().toISOString().split('T')[0];
        await db.updateUser(userId, {
          dailyMessagesUsed: limit,
          lastResetDate: today,
          extraMessages: 0,
        });
        const updated = await db.getUser(userId);
        logger.info('[E2E] Saturated message limit', {userId, limit});
        return res.json({ok: true, user: updated});
      } catch (error) {
        logger.error('[E2E] saturate-message-limit failed', {error});
        return res.status(500).json({error: 'Failed to saturate message limit'});
      }
    },
  );

  return router;
};

export default createDevRouter;
