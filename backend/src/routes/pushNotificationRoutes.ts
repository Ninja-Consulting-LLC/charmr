import express from 'express';
import {sendPushNotification} from '../services/pushNotificationService';
import logger from '../utils/logger';

const router = express.Router();

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

export default router;
