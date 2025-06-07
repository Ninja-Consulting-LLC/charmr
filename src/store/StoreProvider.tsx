import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {signOut as firebaseSignOut, getAuthToken} from '../config/firebase';
import {useStoreState} from '../hooks/useStoreState';
import * as authService from '../services/authService';
import * as matchService from '../services/matchService';
import * as userService from '../services/userService';
import {SubscriptionTier} from '../types/enums';
import {User} from '../types/user';
import {logger} from '../utils/logger';
import {Match} from '../utils/matchUtils';
import {getPlanLimits} from '../utils/planLimits';

interface StoreContextType {
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
  user: any;
  setUser: (user: any) => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  updateUserPlan: (plan: SubscriptionTier) => Promise<void>;
  showUpgradeModal: boolean;
  setShowUpgradeModal: (show: boolean) => void;
  createNewUser: () => Promise<User>;
  linkAnonymousUser: (registeredUserId: string) => Promise<void>;
  handleGoogleLogin: (firebaseUser: any) => Promise<void>;
  matches: Match[];
  setMatches: (matches: Match[]) => void;
  addMatch: (match: Match) => void;
  updateMatch: (match: Match) => void;
  removeMatch: (matchId: string) => void;
  loadMatches: () => Promise<void>;
  // Dating Coach state
  selectedMatch: Match | null;
  setSelectedMatch: (match: Match | null) => void;
  deleteScreenshots: boolean;
  setDeleteScreenshots: (value: boolean) => void;
  signOut: () => Promise<void>;
}

export const StoreContext = createContext<StoreContextType>(
  {} as StoreContextType,
);

// Add store instance for use outside of React components
let storeInstance: StoreContextType | null = null;

// Add useStore hook
export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  storeInstance = context;
  return context;
};

// Function to get store instance outside of React components
export const getStore = () => {
  if (!storeInstance) {
    throw new Error('Store not initialized');
  }
  return storeInstance;
};

export const StoreProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const [showKeyboardModal, setShowKeyboardModal] = useState(false);
  const [showDevMenu, setShowDevMenu] = useState(false);
  const [skipRateLimiting, setSkipRateLimiting] = useState(false);
  const [authBypass, setAuthBypass] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  // Dating Coach state
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [deleteScreenshots, setDeleteScreenshots] = useState(true);

  const {
    userId,
    setUserId,
    user,
    setUser,
    isAuthenticated,
    setIsAuthenticated,
    isLoading,
    setIsLoading,
    handleGoogleLogin,
  } = useStoreState(false); // Do NOT skip initialization, so user profile is fetched

  // Remove dating coach preference loading since we're not using a toggle anymore
  useEffect(() => {
    if (__DEV__ || process.env.NODE_ENV === 'development') {
      setAuthBypass(true);
    }
  }, []);

  // Initialize app state
  useEffect(() => {
    const initializeApp = async () => {
      try {
        logger.app.info('🚀 Starting app initialization...');

        // Check authentication state
        const storedIsAuthenticated = await AsyncStorage.getItem(
          '@charmr/isAuthenticated',
        );
        const storedUserId = await AsyncStorage.getItem('@charmr/userId');
        const storedUser = await AsyncStorage.getItem('@charmr/user');

        logger.app.info('🔍 Checking authentication state:', {
          isAuthenticated: storedIsAuthenticated,
          userId: storedUserId,
          hasUserData: !!storedUser,
        });

        // If we have stored credentials, verify they're still valid
        if (storedUserId && storedIsAuthenticated === 'true') {
          try {
            // First check if we have a valid Firebase token
            const token = await getAuthToken();
            if (!token) {
              logger.app.info(
                '❌ No Firebase token found, falling back to stored user data',
              );
              // If we have stored user data, use it
              if (storedUser) {
                const userData = JSON.parse(storedUser);
                setUserId(storedUserId);
                setUser(userData);
                setIsAuthenticated(true);
                setIsLoading(false);
                return;
              }
            }

            // Verify the user ID is still valid
            const currentUserId = await authService.getUserId();
            if (currentUserId === storedUserId) {
              setUserId(storedUserId);
              setIsAuthenticated(true);
              if (storedUser) {
                setUser(JSON.parse(storedUser));
              }
              logger.app.info('✅ User is authenticated');
            } else {
              // Only clear auth-related data
              await AsyncStorage.multiRemove([
                '@charmr/isAuthenticated',
                '@charmr/userId',
                '@charmr/user',
                '@charmr/user_data',
                '@charmr/user_settings',
                '@charmr/user_profile',
                '@charmr/auth_token',
                '@charmr/email',
                '@charmr/name',
                '@charmr/plan',
                '@charmr/dailyMessagesUsed',
                '@charmr/extraMessages',
                '@charmr/lastResetDate',
              ]);
              logger.app.info(
                '❌ Stored credentials are invalid, clearing them',
              );
              setIsAuthenticated(false);
              setUserId('');
            }
          } catch (error) {
            // If there's an error verifying the user, only clear auth data
            await AsyncStorage.multiRemove([
              '@charmr/isAuthenticated',
              '@charmr/userId',
              '@charmr/user',
              '@charmr/user_data',
              '@charmr/user_settings',
              '@charmr/user_profile',
              '@charmr/auth_token',
              '@charmr/email',
              '@charmr/name',
              '@charmr/plan',
              '@charmr/dailyMessagesUsed',
              '@charmr/extraMessages',
              '@charmr/lastResetDate',
            ]);
            logger.app.error('❌ Error verifying stored credentials:', error);
            setIsAuthenticated(false);
            setUserId('');
          }
        }

        setIsLoading(false);
      } catch (error) {
        logger.app.error('Error during app initialization:', error);
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Set device token in Firestore when app loads and user is authenticated
  useEffect(() => {
    const setDeviceToken = async () => {
      if (!isAuthenticated || !userId) return;
      try {
        const {pushNotificationService} = await import(
          '../services/PushNotificationService'
        );
        const token = await pushNotificationService.getToken();
        if (token) {
          await userService.updateUserProfile(userId, {deviceToken: token});
          logger.app.info('Device token updated in Firestore', {userId, token});
        } else {
          logger.app.warn('No device token available to update in Firestore', {
            userId,
          });
        }
        // Listen for token refresh and update Firestore
        pushNotificationService.onTokenRefresh(async (newToken: string) => {
          await userService.updateUserProfile(userId, {deviceToken: newToken});
          logger.app.info('Device token refreshed and updated in Firestore', {
            userId,
            newToken,
          });
        });
      } catch (error) {
        logger.app.error('Failed to set device token in Firestore', {error});
      }
    };
    setDeviceToken();
  }, [isAuthenticated, userId]);

  const updateUserPlan = async (plan: SubscriptionTier) => {
    try {
      if (!userId) {
        throw new Error('No user ID available');
      }
      await userService.updateUserPlan(userId, plan);
      setUser({
        plan,
        getDailyMessageLimit: () => getPlanLimits(plan),
      });
      logger.app.info('User Plan Updated', {
        event: 'update_user_plan',
        userId,
        plan,
      });
    } catch (error) {
      logger.app.error('User Plan Update Error', {
        event: 'update_user_plan_error',
        userId,
        plan,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  };

  // Load matches when user ID changes
  useEffect(() => {
    if (userId) {
      loadMatches();
    }
  }, [userId]);

  const loadMatches = async () => {
    try {
      if (!userId) {
        return;
      }

      const loadedMatches = await matchService.loadMatches(true);
      setMatches(loadedMatches);
    } catch (error) {
      logger.app.error('Load Matches Error', {
        event: 'load_matches_error',
        userId,
        error: error instanceof Error ? error.message : error,
      });
    }
  };

  const addMatch = async (match: Match) => {
    try {
      const newMatch = await matchService.addMatch(match);
      if (newMatch) {
        setMatches(prev => [...prev, newMatch]);
      }
      return newMatch;
    } catch (error) {
      console.error('Error adding match:', error);
      return null;
    }
  };

  const updateMatch = async (updatedMatch: Match) => {
    try {
      const match = await matchService.updateMatch(updatedMatch);
      setMatches(prevMatches =>
        prevMatches.map(m => (m.id === match.id ? match : m)),
      );
      logger.app.info('Match Updated', {
        event: 'update_match',
        matchId: match.id,
        userId,
      });
    } catch (error) {
      logger.app.error('Update Match Error', {
        event: 'update_match_error',
        userId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  };

  const removeMatch = async (matchId: string) => {
    try {
      const success = await matchService.deleteMatch(matchId);
      if (success) {
        setMatches(prevMatches => prevMatches.filter(m => m.id !== matchId));
        logger.app.info('Match Removed', {
          event: 'remove_match',
          matchId,
          userId,
        });
      }
    } catch (error) {
      logger.app.error('Remove Match Error', {
        event: 'remove_match_error',
        userId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  };

  const createNewUser = async () => {
    try {
      const newUser = await userService.createAnonymousUser();
      setUser(newUser);
      setUserId(newUser.id);
      await AsyncStorage.setItem('@charmr/userId', newUser.id);
      setIsAuthenticated(true);
      await AsyncStorage.setItem('@charmr/isAuthenticated', 'true');
      return newUser;
    } catch (error) {
      logger.app.error('Error creating new user', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  };

  const linkAnonymousUser = async (registeredUserId: string) => {
    try {
      if (!userId) {
        throw new Error('No anonymous user ID available');
      }

      await userService.linkAnonymousUser(userId, registeredUserId);

      // Fetch the updated user profile after linking
      const updatedUser = await userService.getUserProfile(registeredUserId);
      if (updatedUser) {
        setUser(updatedUser);
      }

      // Update local state
      setUserId(registeredUserId);
      await AsyncStorage.setItem('@charmr/userId', registeredUserId);
      setIsAuthenticated(true);
      await AsyncStorage.setItem('@charmr/isAuthenticated', 'true');

      logger.app.info('Anonymous User Linked', {
        event: 'link_anonymous_user',
        oldUserId: userId,
        newUserId: registeredUserId,
      });
    } catch (error) {
      logger.app.error('Link Anonymous User Error', {
        event: 'link_anonymous_user_error',
        oldUserId: userId,
        newUserId: registeredUserId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  };

  const signOut = async () => {
    try {
      // Clear all local state
      setUserId('');
      setUser({
        id: '',
        plan: SubscriptionTier.FREE,
        dailyMessagesUsed: 0,
        extraMessages: 0,
        lastResetDate: new Date().toISOString(),
        getDailyMessageLimit: () => 0,
      });
      setIsAuthenticated(false);
      setMatches([]);
      setSelectedMatch(null);

      // Clear stored credentials except installation ID
      await AsyncStorage.multiRemove([
        '@charmr/isAuthenticated',
        '@charmr/userId',
        '@charmr/user_data',
        '@charmr/user_settings',
        '@charmr/user_profile',
        '@charmr/auth_token',
        '@charmr/user',
        '@charmr/email',
        '@charmr/name',
        '@charmr/plan',
        '@charmr/dailyMessagesUsed',
        '@charmr/extraMessages',
        '@charmr/lastResetDate',
      ]);

      // Sign out from Firebase
      await firebaseSignOut();

      logger.app.info('Successfully signed out and cleared all data');
    } catch (error) {
      logger.app.error('Error during sign out:', error);
      // Even if there's an error, we should still clear local state
      setUserId('');
      setUser({
        id: '',
        plan: SubscriptionTier.FREE,
        dailyMessagesUsed: 0,
        extraMessages: 0,
        lastResetDate: new Date().toISOString(),
        getDailyMessageLimit: () => 0,
      });
      setIsAuthenticated(false);
      setMatches([]);
      setSelectedMatch(null);
    }
  };

  const value = useMemo(
    () => ({
      showKeyboardModal,
      setShowKeyboardModal,
      userId,
      setUserId,
      showDevMenu,
      setShowDevMenu,
      skipRateLimiting,
      setSkipRateLimiting,
      authBypass,
      setAuthBypass,
      user,
      setUser,
      isAuthenticated,
      setIsAuthenticated,
      isLoading,
      setIsLoading,
      updateUserPlan,
      showUpgradeModal,
      setShowUpgradeModal,
      createNewUser,
      linkAnonymousUser,
      handleGoogleLogin,
      matches,
      setMatches,
      addMatch,
      updateMatch,
      removeMatch,
      loadMatches,
      selectedMatch,
      setSelectedMatch,
      deleteScreenshots,
      setDeleteScreenshots,
      signOut,
    }),
    [
      showKeyboardModal,
      userId,
      showDevMenu,
      skipRateLimiting,
      authBypass,
      user,
      isAuthenticated,
      isLoading,
      showUpgradeModal,
      matches,
      selectedMatch,
      deleteScreenshots,
    ],
  );

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
};
