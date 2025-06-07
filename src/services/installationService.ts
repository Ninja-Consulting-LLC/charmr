import AsyncStorage from '@react-native-async-storage/async-storage';
import {getInstallations} from '@react-native-firebase/installations';
import {logger} from '../utils/logger';

const INSTALLATION_ID_KEY = '@charmr/installation_id';

class InstallationService {
  private static instance: InstallationService;
  private cachedId: string | null = null;

  private constructor() {}

  static getInstance(): InstallationService {
    if (!InstallationService.instance) {
      InstallationService.instance = new InstallationService();
    }
    return InstallationService.instance;
  }

  async getInstallationId(): Promise<string> {
    try {
      // Return cached ID if available
      if (this.cachedId) {
        return this.cachedId;
      }

      // Try to get from storage first
      const storedId = await AsyncStorage.getItem(INSTALLATION_ID_KEY);
      if (storedId) {
        this.cachedId = storedId;
        return storedId;
      }

      // Get fresh installation ID from Firebase
      const id = await getInstallations().getId();
      this.cachedId = id;
      await AsyncStorage.setItem(INSTALLATION_ID_KEY, id);

      logger.app.debug('Got installation ID', {installationId: id});
      return id;
    } catch (error) {
      logger.app.error('Failed to get installation ID:', error);
      throw error;
    }
  }

  async clearInstallationId(): Promise<void> {
    this.cachedId = null;
    await AsyncStorage.removeItem(INSTALLATION_ID_KEY);
  }
}

export const installationService = InstallationService.getInstance();
