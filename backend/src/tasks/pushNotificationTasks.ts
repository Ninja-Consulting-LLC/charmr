import {sendPushNotification} from '../services/pushNotificationService';
import logger from '../utils/logger';

// This should be stored in a database in production
const TEST_DEVICE_TOKENS: string[] = [];

export function startPushNotificationTasks() {
  // Send test notification every 5 minutes
  setInterval(async () => {
    try {
      if (TEST_DEVICE_TOKENS.length === 0) {
        logger.debug('No test device tokens available');
        return;
      }

      for (const token of TEST_DEVICE_TOKENS) {
        await sendPushNotification(
          token,
          'Periodic Test Notification',
          `This is a test notification sent at ${new Date().toLocaleTimeString()}`,
          {
            type: 'periodic_test',
            timestamp: new Date().toISOString(),
          },
        );
      }

      logger.debug('Successfully sent periodic test notifications');
    } catch (error) {
      logger.error('Error sending periodic test notifications:', error);
    }
  }, 5 * 60 * 1000); // 5 minutes
}

// Function to add a test device token
export function addTestDeviceToken(token: string) {
  if (!TEST_DEVICE_TOKENS.includes(token)) {
    TEST_DEVICE_TOKENS.push(token);
    logger.debug('Added test device token:', token);
  }
}

// Function to remove a test device token
export function removeTestDeviceToken(token: string) {
  const index = TEST_DEVICE_TOKENS.indexOf(token);
  if (index > -1) {
    TEST_DEVICE_TOKENS.splice(index, 1);
    logger.debug('Removed test device token:', token);
  }
}
