import AsyncStorage from '@react-native-async-storage/async-storage';

export class DevUtils {
  static shouldBypassAuth(): boolean {
    // Check if we should bypass auth in development
    return __DEV__;
  }

  static async resetOnboarding(): Promise<void> {
    try {
      await AsyncStorage.removeItem('hasOnboarded');
      console.log('Onboarding reset successfully');
    } catch (error) {
      console.error('Error resetting onboarding:', error);
    }
  }

  static async clearStorage(): Promise<void> {
    try {
      await AsyncStorage.clear();
      console.log('Storage cleared successfully');
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }

  static async clearMatchStorage(): Promise<void> {
    try {
      await AsyncStorage.removeItem('matches');
      console.log('Match storage cleared successfully');
    } catch (error) {
      console.error('Error clearing match storage:', error);
    }
  }

  static async inspectStorage(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const items = await AsyncStorage.multiGet(keys);
      console.log('Storage contents:', items);
    } catch (error) {
      console.error('Error inspecting storage:', error);
    }
  }

  static async toggleSandboxMode(): Promise<void> {
    try {
      const currentMode = await AsyncStorage.getItem('sandboxMode');
      const newMode = currentMode === 'true' ? 'false' : 'true';
      await AsyncStorage.setItem('sandboxMode', newMode);
      console.log('Sandbox mode toggled to:', newMode);
    } catch (error) {
      console.error('Error toggling sandbox mode:', error);
    }
  }

  static async isSandboxMode(): Promise<boolean> {
    try {
      const mode = await AsyncStorage.getItem('sandboxMode');
      return mode === 'true';
    } catch (error) {
      console.error('Error checking sandbox mode:', error);
      return false;
    }
  }
}
