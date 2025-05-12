import {Router} from 'express';
import {
  createUser,
  getUser,
  getUserByInstallationId,
  getUserMessages,
  getUsers,
  linkAnonymousUser,
  resetUserMessageLimit,
  updateUserPlan,
} from '../controllers/adminController';
import {Database} from '../db/types';

const createAdminRouter = (db: Database) => {
  const router = Router();

  // Middleware to inject database
  const withDb = (handler: Function) => async (req: any, res: any) => {
    return handler(req, res, db);
  };

  router.get('/users', withDb(getUsers));
  router.post('/users', withDb(createUser));
  router.get('/users/:userId/messages', withDb(getUserMessages));
  router.post('/users/:userId/reset-messages', withDb(resetUserMessageLimit));
  router.put('/users/:userId/plan', withDb(updateUserPlan));
  router.get('/users/:userId', withDb(getUser));
  router.get(
    '/users/installation/:installationId',
    withDb(getUserByInstallationId),
  );
  router.post('/users/link', withDb(linkAnonymousUser));

  return router;
};

export default createAdminRouter;
