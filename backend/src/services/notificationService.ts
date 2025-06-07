import {Database} from '../db/types';
import {sendPushNotification} from '../services/pushNotificationService';
import logger from '../utils/logger';

export type NotificationType = 'coach' | 'match' | 'message';

export interface NotificationConfig {
  title: string;
  body: string;
  type: NotificationType;
  checkInterval: number; // in milliseconds
  minInterval: number; // in milliseconds
}

export const NOTIFICATION_CONFIGS: Record<
  NotificationType,
  NotificationConfig
> = {
  coach: {
    title: 'Your Dating Coach is Here!',
    body: 'Ready to improve your dating game? Your coach is available to help!',
    type: 'coach',
    checkInterval: 60 * 1000, // Check every minute
    minInterval: 3 * 24 * 60 * 60 * 1000, // Minimum 3 days between notifications
  },
  match: {
    title: 'New Match Alert!',
    body: 'You have a new match waiting for you!',
    type: 'match',
    checkInterval: 60 * 1000, // Check every minute
    minInterval: 3 * 24 * 60 * 60 * 1000, // Minimum 3 days between notifications
  },
  message: {
    title: 'New Message Received',
    body: 'You have a new message from your match!',
    type: 'message',
    checkInterval: 60 * 1000, // Check every minute
    minInterval: 3 * 24 * 60 * 60 * 1000, // Minimum 3 days between notifications
  },
};

export const createNotificationService = (db: Database) => {
  const sendNotification = async (
    userId: string,
    notificationType: NotificationType,
  ) => {
    try {
      const user = await db.getUser(userId);
      if (!user) {
        logger.warn('Cannot send notification - user not found', {
          userId,
          notificationType,
        });
        return;
      }

      // Skip notifications for anonymous users
      if (user.email === user.installationId) {
        logger.info('Skipping notification for anonymous user', {
          userId,
          notificationType,
        });
        return;
      }

      if (!user.deviceToken) {
        logger.warn('Cannot send notification - no device token', {
          userId,
          notificationType,
        });
        return;
      }

      const config = NOTIFICATION_CONFIGS[notificationType];
      await sendPushNotification(user.deviceToken, config.title, config.body, {
        type: notificationType,
        userId,
      });

      // Update the last notification date
      const notificationDates = user.notificationDates || {};
      notificationDates[notificationType] = new Date().toISOString();
      await db.updateUser(userId, {notificationDates});

      logger.info('Notification sent successfully', {
        userId,
        notificationType,
      });
    } catch (error) {
      logger.error('Failed to send notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        userId,
        notificationType,
      });
    }
  };

  const checkAndSendNotifications = async (
    notificationType: NotificationType,
  ) => {
    try {
      let users: any[] = [];
      if (
        process.env.DATABASE_TYPE === 'firestore' &&
        typeof (db as any).getUsersWithDeviceToken === 'function'
      ) {
        users = await (db as any).getUsersWithDeviceToken();
      } else {
        users = await db.all(
          'SELECT id, deviceToken, notificationDates, email, installationId FROM users WHERE deviceToken IS NOT NULL',
        );
      }

      // Filter out users with null device tokens and anonymous users
      users = users.filter(
        user => user.deviceToken && user.email !== user.installationId,
      );

      logger.info('Checking notifications', {
        notificationType,
        userCount: users.length,
      });

      for (const user of users) {
        const notificationDates =
          typeof user.notificationDates === 'string'
            ? JSON.parse(user.notificationDates || '{}')
            : user.notificationDates || {};
        const lastNotification = notificationDates[notificationType];
        const config = NOTIFICATION_CONFIGS[notificationType];

        // Calculate time since last notification
        const timeSinceLastNotification = lastNotification
          ? Date.now() - new Date(lastNotification).getTime()
          : Infinity;

        if (
          !lastNotification ||
          timeSinceLastNotification >= config.minInterval
        ) {
          await sendNotification(user.id, notificationType);
        }
      }
    } catch (error) {
      logger.error('Failed to check notifications', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        notificationType,
      });
    }
  };

  return {
    sendNotification,
    checkAndSendNotifications,
  };
};
