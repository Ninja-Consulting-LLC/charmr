import express from 'express';
import {
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
  testContext,
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
  router.post('/users', async (req, res) => {
    const user = await createUser(db, {
      id: req.body.id,
      email: req.body.email,
      name: req.body.name,
      plan: req.body.plan,
      installationId: req.body.installationId,
    });
    if (user) {
      res.status(201).json(user);
    } else {
      res.status(400).json({error: 'Failed to create user'});
    }
  });
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
  router.post('/reset-db', (req, res) => resetDb(req, res, db));
  router.post('/test-context', (req, res) => testContext(req, res, db));

  return router;
};

export default createAdminRouter;
