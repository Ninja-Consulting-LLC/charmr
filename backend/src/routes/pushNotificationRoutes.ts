import express from 'express';
import {Database} from '../db/types';
import {authenticateUser} from '../middleware/auth';
import {sendPushNotification} from '../services/pushNotificationService';
import logger from '../utils/logger';

const createPushNotificationRouter = (db: Database) => {
  const router = express.Router();

  // Helper to get user ID from either Firebase token or anonymous user ID
  const getUserFromRequest = (req: express.Request) => {
    // In development mode, just use the userId from params
    if (process.env.NODE_ENV === 'development') {
      return req.params.userId;
    }

    // If using Firebase token, get user ID from token
    if (req.headers.authorization?.startsWith('Bearer ')) {
      // Use the verified user ID from the token
      return req.user?.uid;
    }
    // If using anonymous user ID (installation ID), use that
    const anonymousUserId = req.headers['x-anonymous-user'] as string;
    if (!anonymousUserId) {
      throw new Error('No user ID found in request');
    }
    return anonymousUserId;
  };

  // Apply authentication middleware to all routes
  router.use(authenticateUser);

  // Test endpoint to send a push notification
  router.post('/test', async (req, res) => {
    try {
      const {
        token,
        title = 'Test Notification',
        body = 'This is a test notification',
      } = req.body;

      if (!token) {
        return res.status(400).json({error: 'Token is required'});
      }

      const messageId = await sendPushNotification(token, title, body, {
        type: 'test',
        timestamp: new Date().toISOString(),
      });

      res.json({success: true, messageId});
    } catch (error) {
      logger.error('Failed to send test notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      res.status(500).json({
        error: 'Failed to send notification',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return router;
};

export default createPushNotificationRouter;
