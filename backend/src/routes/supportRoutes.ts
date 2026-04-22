import express from 'express';
import {createSupportTicket} from '../controllers/supportController';
import {Database} from '../db/types';
import {authenticateUser} from '../middleware';
import logger from '../utils/logger';

const createSupportTicketsRouter = (db: Database) => {
  const router = express.Router();

  router.post(
    '/',
    (req, _res, next) => {
      logger.debug(`[${new Date().toISOString()}] [Support] Support tickets route`, {
        path: req.path,
        method: req.method,
        bodyKeys:
          req.body && typeof req.body === 'object'
            ? Object.keys(req.body as object)
            : [],
      });
      next();
    },
    authenticateUser,
    async (req, res, next) => {
      logger.debug(
        `[${new Date().toISOString()}] [Support] Ticket handler reached`,
      );
      try {
        await createSupportTicket(req, res, db);
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
};

export default createSupportTicketsRouter;
