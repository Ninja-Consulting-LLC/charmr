import AsyncStorage from '@react-native-async-storage/async-storage';

const INSTALLATION_ID_KEY = '@charmr/installation_id';

const generateInstallationId = () =>
  `web-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

class InstallationService {
  private static instance: InstallationService;
  private cachedId: string | null = null;

  static getInstance(): InstallationService {
    if (!InstallationService.instance) {
      InstallationService.instance = new InstallationService();
    }
    return InstallationService.instance;
  }

  async getInstallationId(): Promise<string> {
    if (this.cachedId) {
      return this.cachedId;
    }

    const storedId = await AsyncStorage.getItem(INSTALLATION_ID_KEY);
    if (storedId) {
      this.cachedId = storedId;
      return storedId;
    }

    const newId = generateInstallationId();
    this.cachedId = newId;
    await AsyncStorage.setItem(INSTALLATION_ID_KEY, newId);
    return newId;
  }

  async clearInstallationId(): Promise<void> {
    this.cachedId = null;
    await AsyncStorage.removeItem(INSTALLATION_ID_KEY);
  }
}

export const installationService = InstallationService.getInstance();
