import {useEffect} from 'react';
import * as userService from '../services/userService';
import {useStore} from '../store/StoreProvider';
import {logger} from '../utils/logger';

export const usePushNotifications = () => {
  const {isAuthenticated, userId, user} = useStore();

  useEffect(() => {
    const setupPushNotifications = async () => {
      if (!isAuthenticated || !userId) return;

      // Skip device token updates for anonymous users
      if (user?.email === user?.installationId) {
        logger.app.info('Skipping device token update for anonymous user', {
          userId,
        });
        return;
      }

      try {
        const {pushNotificationService} = await import(
          '../services/PushNotificationService'
        );

        // Request permission and get token
        const hasPermission = await pushNotificationService.requestPermission();
        if (!hasPermission) {
          logger.app.warn('Push notification permission not granted');
          return;
        }

        const token = await pushNotificationService.getToken();
        if (token) {
          // Only update if the token has changed
          if (token !== user?.deviceToken) {
            await userService.updateUserProfile(userId, {deviceToken: token});
            logger.app.info('Device token updated', {userId, token});
          } else {
            logger.app.info('Device token unchanged, skipping update', {
              userId,
            });
          }
        } else {
          logger.app.warn('No device token available to update', {
            userId,
          });
        }

        // Listen for token refresh and update only if different
        pushNotificationService.onTokenRefresh(async (newToken: string) => {
          if (newToken !== user?.deviceToken) {
            await userService.updateUserProfile(userId, {
              deviceToken: newToken,
            });
            logger.app.info('Device token refreshed and updated', {
              userId,
              newToken,
            });
          } else {
            logger.app.info('Refreshed token unchanged, skipping update', {
              userId,
            });
          }
        });

        // Set up message handlers
        pushNotificationService.onMessage(message => {
          logger.app.info('Received foreground message', {message});
          // TODO: Handle foreground message
        });

        pushNotificationService.onNotificationOpenedApp(message => {
          logger.app.info('App opened from background', {message});
          // TODO: Handle notification opened from background
        });

        // Check if app was opened from a notification
        const initialNotification =
          await pushNotificationService.getInitialNotification();
        if (initialNotification) {
          logger.app.info('App opened from quit state', {
            message: initialNotification,
          });
          // TODO: Handle initial notification
        }
      } catch (error) {
        logger.app.error('Failed to set device token', {error});
      }
    };

    setupPushNotifications();
  }, [isAuthenticated, userId, user]);
};
