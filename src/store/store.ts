import AsyncStorage from '@react-native-async-storage/async-storage';
import {fetchUserData} from '../services/api';
import {ID} from '../types';
import {SubscriptionTier} from '../types/enums';
import {User} from '../types/user';
import {Match} from '../utils/matchUtils';
import {getPlanLimits} from '../utils/planLimits';
import {createDefaultUser} from '../utils/storeUtils';

// Define the store state and methods
export interface Store {
  showKeyboardModal: boolean;
  setShowKeyboardModal: (show: boolean) => void;
  userId: string;
  setUserId: (userId: string) => void;
  showDevMenu: boolean;
  setShowDevMenu: (show: boolean) => void;
  skipRateLimiting: boolean;
  setSkipRateLimiting: (skip: boolean) => void;
  authBypass: boolean;
  setAuthBypass: (bypass: boolean) => void;
  user: User;
  setUser: (user: Partial<User>) => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  updateUserPlan: (plan: SubscriptionTier) => Promise<void>;
  showUpgradeModal: boolean;
  setShowUpgradeModal: (show: boolean) => void;
  createNewUser: () => Promise<void>;
  linkAnonymousUser: (registeredUserId: string) => Promise<void>;
  handleGoogleLogin: (firebaseUser: any) => Promise<void>;
  // Match management
  matches: Match[];
  setMatches: (matches: Match[]) => void;
  addMatch: (match: Match) => void;
  updateMatch: (match: Match) => void;
  removeMatch: (matchId: ID) => void;
  loadMatches: () => Promise<void>;
}

// Add version key for detecting backend resets
export const BACKEND_VERSION_KEY = 'backend_version';
export const CURRENT_BACKEND_VERSION = '1.0.0';

// Default store state
export const defaultStore: Store = {
  showKeyboardModal: false,
  setShowKeyboardModal: () => {},
  userId: '',
  setUserId: () => {},
  showDevMenu: false,
  setShowDevMenu: () => {},
  skipRateLimiting: false,
  setSkipRateLimiting: () => {},
  authBypass: false,
  setAuthBypass: () => {},
  user: createDefaultUser(),
  setUser: () => {},
  isAuthenticated: false,
  setIsAuthenticated: () => {},
  isLoading: true,
  setIsLoading: () => {},
  updateUserPlan: async () => {},
  showUpgradeModal: false,
  setShowUpgradeModal: () => {},
  createNewUser: async () => {},
  linkAnonymousUser: async () => {},
  handleGoogleLogin: async () => {},
  // Match management
  matches: [],
  setMatches: () => {},
  addMatch: () => {},
  updateMatch: () => {},
  removeMatch: () => {},
  loadMatches: async () => {},
};

// Store utility functions
export const cleanupStaleData = async () => {
  try {
    await AsyncStorage.removeItem('userId');
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('isAuthenticated');
  } catch (error) {
    console.error('Error cleaning up stale data:', error);
  }
};

export const checkBackendVersion = async () => {
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

export const syncUserWithBackend = async (userId: string) => {
  try {
    const userData = await fetchUserData(userId);
    if (userData) {
      return {
        ...userData,
        getDailyMessageLimit: () => getPlanLimits(userData.plan),
      };
    }
  } catch (error) {
    console.error('Error syncing user data:', error);
  }
  return null;
};
