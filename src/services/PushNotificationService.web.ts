import {logger} from '../utils/logger';

const warn = (message: string) => {
  console.warn(`[web-preview] ${message}`);
  logger.app.warn(`[web-preview] ${message}`);
};

class PushNotificationService {
  async requestPermission(): Promise<boolean> {
    warn('Push notifications are not supported in browser preview.');
    return false;
  }

  async getToken(): Promise<string | null> {
    warn('FCM token is unavailable in browser preview.');
    return null;
  }

  async onTokenRefresh(_callback: (token: string) => void): Promise<void> {
    warn('Token refresh listener is disabled in browser preview.');
  }

  async onMessage(_callback: (message: any) => void): Promise<void> {
    warn('Foreground push listeners are disabled in browser preview.');
  }

  async onNotificationOpenedApp(
    _callback: (message: any) => void,
  ): Promise<void> {
    warn('Notification open listeners are disabled in browser preview.');
  }

  async getInitialNotification(): Promise<any> {
    return null;
  }
}

export const pushNotificationService = new PushNotificationService();
