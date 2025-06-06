import messaging from '@react-native-firebase/messaging';
import {Platform} from 'react-native';
import {logger} from '../utils/logger';

class PushNotificationService {
  private static instance: PushNotificationService;
  private token: string | null = null;
  private readonly MAX_RETRIES = 3;
  private readonly INITIAL_RETRY_DELAY = 1000; // 1 second

  private constructor() {
    logger.app.info('PushNotificationService initialized', {
      platform: Platform.OS,
      version: Platform.Version,
    });
  }

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      logger.app.info('Creating new PushNotificationService instance');
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async requestPermission(): Promise<boolean> {
    try {
      logger.app.info('Requesting push notification permission...');

      if (Platform.OS === 'ios') {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        logger.app.info('Push notification permission status:', {
          status: authStatus,
          enabled,
          platform: Platform.OS,
          version: Platform.Version,
        });

        return enabled;
      }

      logger.app.info('Android platform - permission granted by default');
      return true;
    } catch (error) {
      logger.app.error('Failed to request push notification permission:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        platform: Platform.OS,
        version: Platform.Version,
      });
      return false;
    }
  }

  async getToken(retryCount = 0): Promise<string | null> {
    try {
      logger.app.info('Attempting to get FCM token...', {
        attempt: retryCount + 1,
        maxRetries: this.MAX_RETRIES,
        hasCachedToken: !!this.token,
      });

      if (!this.token) {
        this.token = await messaging().getToken();
        logger.app.info('Successfully got FCM token:', {
          token: this.token,
          tokenLength: this.token?.length,
          platform: Platform.OS,
          version: Platform.Version,
        });
      } else {
        logger.app.info('Using cached FCM token:', {
          token: this.token,
          tokenLength: this.token.length,
        });
      }
      return this.token;
    } catch (error) {
      logger.app.error('Failed to get FCM token:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        attempt: retryCount + 1,
        maxRetries: this.MAX_RETRIES,
        platform: Platform.OS,
        version: Platform.Version,
      });

      // Implement retry with exponential backoff
      if (retryCount < this.MAX_RETRIES) {
        const delay = this.INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
        logger.app.info(
          `Retrying FCM token fetch in ${delay}ms (attempt ${retryCount + 1}/${
            this.MAX_RETRIES
          })`,
          {
            delay,
            nextAttempt: retryCount + 1,
            platform: Platform.OS,
            version: Platform.Version,
          },
        );
        await this.sleep(delay);
        return this.getToken(retryCount + 1);
      }

      return null;
    }
  }

  async onTokenRefresh(callback: (token: string) => void): Promise<void> {
    try {
      logger.app.info('Setting up FCM token refresh listener');
      messaging().onTokenRefresh(token => {
        this.token = token;
        logger.app.info('FCM token refreshed:', {
          newToken: token,
          tokenLength: token.length,
          platform: Platform.OS,
          version: Platform.Version,
        });
        callback(token);
      });
    } catch (error) {
      logger.app.error('Failed to set up token refresh listener:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        platform: Platform.OS,
        version: Platform.Version,
      });
    }
  }

  async onMessage(callback: (message: any) => void): Promise<void> {
    try {
      logger.app.info('Setting up foreground message listener');
      messaging().onMessage(async remoteMessage => {
        logger.app.info('Received foreground message:', {
          message: remoteMessage,
          data: remoteMessage.data,
          notification: remoteMessage.notification,
          platform: Platform.OS,
          version: Platform.Version,
        });
        callback(remoteMessage);
      });
    } catch (error) {
      logger.app.error('Failed to set up message listener:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        platform: Platform.OS,
        version: Platform.Version,
      });
    }
  }

  async onNotificationOpenedApp(
    callback: (message: any) => void,
  ): Promise<void> {
    try {
      logger.app.info('Setting up notification opened listener');
      messaging().onNotificationOpenedApp(remoteMessage => {
        logger.app.info('App opened from background state:', {
          message: remoteMessage,
          data: remoteMessage.data,
          notification: remoteMessage.notification,
          platform: Platform.OS,
          version: Platform.Version,
        });
        callback(remoteMessage);
      });
    } catch (error) {
      logger.app.error('Failed to set up notification opened listener:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        platform: Platform.OS,
        version: Platform.Version,
      });
    }
  }

  async getInitialNotification(): Promise<any> {
    try {
      logger.app.info('Checking for initial notification');
      const remoteMessage = await messaging().getInitialNotification();
      if (remoteMessage) {
        logger.app.info('App opened from quit state:', {
          message: remoteMessage,
          data: remoteMessage.data,
          notification: remoteMessage.notification,
          platform: Platform.OS,
          version: Platform.Version,
        });
      } else {
        logger.app.info('No initial notification found');
      }
      return remoteMessage;
    } catch (error) {
      logger.app.error('Failed to get initial notification:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        platform: Platform.OS,
        version: Platform.Version,
      });
      return null;
    }
  }
}

export const pushNotificationService = PushNotificationService.getInstance();
