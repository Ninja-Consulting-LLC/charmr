import express from 'express';
import {createSupportTicket} from '../controllers/supportController';
import {getDatabase} from '../db';
import {authenticateUser} from '../middleware';
import logger from '../utils/logger';

const router = express.Router();

// Add logging middleware specific to the support route
router.post(
  '/',
  (req, res, next) => {
    logger.debug(`[${new Date().toISOString()}] [Support] Support route hit:`, {
      path: req.path,
      method: req.method,
      body: req.body,
    });
    next();
  },
  authenticateUser,
  async (req, res, next) => {
    logger.debug(
      `[${new Date().toISOString()}] [Support] Route handler reached`,
    );
    try {
      const db = await getDatabase();
      await createSupportTicket(req, res, db);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
