import express from 'express';
import {
  clearDatabase,
  createUser,
  getMessageCosts,
  getUser,
  getUserByInstallationId,
  getUserInfo,
  getUserMessageHistory,
  getUserMessages,
  getUsers,
  linkAnonymousUser,
  resetDb,
  resetUserMessageLimit,
  updateUserPlan,
} from '../controllers/adminController';
import {Database} from '../db/types';
import {adminAuth} from '../middleware/adminAuth';

const createAdminRouter = (db: Database) => {
  const router = express.Router();

  // Apply admin authentication middleware to all routes
  router.use(adminAuth);

  // User management
  router.get('/users', (req, res) => getUsers(req, res, db));
  router.get('/users/:userId', (req, res) => getUser(req, res, db));
  router.get('/users/installation/:installationId', (req, res) =>
    getUserByInstallationId(req, res, db),
  );
  router.post('/users', (req, res) => createUser(req, res, db));
  router.put('/users/:userId/plan', (req, res) => updateUserPlan(req, res, db));
  router.post('/users/link', (req, res) => linkAnonymousUser(req, res, db));
  router.post('/users/:userId/reset-message-limit', (req, res) =>
    resetUserMessageLimit(req, res, db),
  );

  // Message management
  router.get('/users/:userId/messages', (req, res) =>
    getUserMessages(req, res, db),
  );
  router.get('/users/:userId/message-history', (req, res) =>
    getUserMessageHistory(req, res, db),
  );
  router.get('/users/:userId/message-costs', (req, res) =>
    getMessageCosts(req, res, db),
  );
  router.get('/users/:userId/info', (req, res) => getUserInfo(req, res, db));

  // Database management
  router.post('/clear-database', (req, res) => clearDatabase(req, res, db));
  router.post('/reset-db', (req, res) => resetDb(req, res, db));

  return router;
};

export default createAdminRouter;
