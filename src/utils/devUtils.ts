import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './logger';

export class DevUtils {
  static shouldBypassAuth(): boolean {
    // Check if we should bypass auth in development
    return __DEV__;
  }

  static async resetOnboarding(): Promise<void> {
    try {
      await AsyncStorage.removeItem('hasOnboarded');
      logger.app.info('Onboarding reset successfully');
    } catch (error) {
      logger.app.error('Error resetting onboarding', error);
    }
  }

  static async clearStorage(): Promise<void> {
    try {
      await AsyncStorage.clear();
      logger.app.info('Storage cleared successfully');
    } catch (error) {
      logger.app.error('Error clearing storage', error);
    }
  }

  static async clearMatchStorage(): Promise<void> {
    try {
      await AsyncStorage.removeItem('matches');
      logger.app.info('Match storage cleared successfully');
    } catch (error) {
      logger.app.error('Error clearing match storage', error);
    }
  }

  static async inspectStorage(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const items = await AsyncStorage.multiGet(keys);
      logger.app.info('Storage contents', items);
    } catch (error) {
      logger.app.error('Error inspecting storage', error);
    }
  }
}
