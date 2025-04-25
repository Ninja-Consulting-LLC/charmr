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

const router = Router();

router.get('/users', getUsers);
router.post('/users', createUser);
router.get('/users/:userId/messages', getUserMessages);
router.post('/users/:userId/reset-messages', resetUserMessageLimit);
router.put('/users/:userId/plan', updateUserPlan);
router.get('/users/:userId', getUser);
router.get('/users/installation/:installationId', getUserByInstallationId);
router.post('/users/link', linkAnonymousUser);

export default router;
