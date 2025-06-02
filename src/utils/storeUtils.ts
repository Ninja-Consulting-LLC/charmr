import AsyncStorage from '@react-native-async-storage/async-storage';
import {SubscriptionTier} from '../types/enums';
import {User} from '../types/user';
import {getPlanLimits} from './planLimits';

export const BACKEND_VERSION_KEY = 'backend_version';
export const CURRENT_BACKEND_VERSION = '1.0.0';

export const cleanupStaleData = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem('@charmr/userId');
    await AsyncStorage.removeItem('@charmr/user');
    await AsyncStorage.removeItem('@charmr/isAuthenticated');
  } catch (error) {
    console.error('Error cleaning up stale data:', error);
  }
};

export const checkBackendVersion = async (): Promise<void> => {
  try {
    const storedVersion = await AsyncStorage.getItem(BACKEND_VERSION_KEY);
    if (storedVersion !== CURRENT_BACKEND_VERSION) {
      await cleanupStaleData();
      await AsyncStorage.setItem(BACKEND_VERSION_KEY, CURRENT_BACKEND_VERSION);
    }
  } catch (error) {
    console.error('Error checking backend version:', error);
  }
};

export const createDefaultUser = (): User => ({
  id: '',
  plan: SubscriptionTier.FREE,
  dailyMessagesUsed: 0,
  extraMessages: 0,
  lastResetDate: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  getDailyMessageLimit: () => getPlanLimits(SubscriptionTier.FREE),
});

export const shouldResetDailyCount = (lastResetDate: string): boolean => {
  const userDate = new Date(lastResetDate);
  const todayDate = new Date();
  return userDate.toDateString() !== todayDate.toDateString();
};
