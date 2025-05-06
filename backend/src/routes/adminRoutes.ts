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
  resetUserMessageLimit,
  updateUserPlan,
} from '../controllers/adminController';
import {adminAuth} from '../middleware/adminAuth';

const router = express.Router();

// Apply admin authentication middleware to all routes
router.use(adminAuth);

// User management
router.get('/users', getUsers);
router.post('/users', createUser);
router.get('/users/:userId', getUser);
router.get('/users/installation/:installationId', getUserByInstallationId);
router.put('/users/:userId/plan', updateUserPlan);
router.post('/users/link', linkAnonymousUser);

// User info and history
router.get('/users/:userId/info', getUserInfo);
router.get('/users/:userId/messages', getUserMessages);
router.get('/users/:userId/history', getUserMessageHistory);
router.get('/users/:userId/costs', getMessageCosts);

// User limits
router.post('/users/:userId/reset-limit', resetUserMessageLimit);

// Database management
router.post('/clear-database', clearDatabase);

export default router;
