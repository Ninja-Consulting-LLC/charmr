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
import {installationService} from '../services/installationService';
import * as matchService from '../services/matchService';
import {
  setSubscriptionUpdateCallback,
  syncSubscriptionState,
} from '../services/revenueCatService';
import * as userService from '../services/userService';
import {SubscriptionTier} from '../types/enums';
import {logger} from '../utils/logger';
import {Match} from '../utils/matchUtils';
import {getPlanLimits} from '../utils/planLimits';
import {StoreContextType} from './types';

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
  } = useStoreState(false); // Do NOT skip initialization, so user profile is fetched

  // Initialize handleProviderLogin
  const handleProviderLogin = async (firebaseUser: any) => {
    try {
      logger.auth.info('Starting provider login process', {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        providerId: firebaseUser.providerId,
      });

      // Get the installation ID directly from the service
      const installationId = await installationService.getInstallationId();

      // Ensure we have a valid Firebase token before proceeding
      const token = await getAuthToken();
      if (!token) {
        logger.auth.error('Failed to get Firebase token after login');
        throw new Error('Failed to get Firebase token after login');
      }

      // First, check if there's an anonymous user with this installation ID
      let anonymousUser = null;
      try {
        anonymousUser = await userService.findUserByInstallationId(
          installationId,
        );
        if (__DEV__) {
          logger.auth.debug('Anonymous user search result', {
            found: !!anonymousUser,
            anonymousUserId: anonymousUser?.id,
          });
        }
      } catch (error) {
        logger.auth.warn('Error finding anonymous user:', error);
      }

      // Check if user exists in our backend
      let existingUser;
      try {
        existingUser = await userService.getUserProfile(firebaseUser.uid);
      } catch (error: any) {
        logger.app.error('Failed to get user profile:', error);
      }

      // If user exists, update local state
      if (existingUser) {
        if (__DEV__) {
          logger.auth.debug('Found existing user', {
            userId: firebaseUser.uid,
            email: existingUser.email,
          });
        }

        // Update user's name if it's from Apple login and we have a display name
        if (
          firebaseUser.displayName &&
          (!existingUser.name || existingUser.name === 'Anonymous User')
        ) {
          try {
            await userService.updateUserProfile(firebaseUser.uid, {
              name: firebaseUser.displayName,
            });
            existingUser.name = firebaseUser.displayName;
          } catch (error) {
            logger.auth.error('Failed to update user name', error);
          }
        }

        setUserId(firebaseUser.uid);
        await AsyncStorage.setItem('@charmr/userId', firebaseUser.uid);
        setUser(existingUser);
        setIsAuthenticated(true);
        await AsyncStorage.setItem('@charmr/isAuthenticated', 'true');
      } else {
        // Create a new user
        if (__DEV__) {
          logger.auth.debug('Creating new user', {
            userId: firebaseUser.uid,
            email: firebaseUser.email,
          });
        }

        const newUser = await userService.createUser({
          id: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName || 'Anonymous User',
          installationId,
        });

        // Now try to link if we found an anonymous user
        if (anonymousUser && anonymousUser.id !== newUser.id) {
          logger.app.debug(
            'Found anonymous user, attempting to link with newly created registered user',
            {
              anonymousUserId: anonymousUser.id,
              registeredUserId: newUser.id,
              anonymousUserEmail: anonymousUser.email,
              registeredUserEmail: newUser.email,
              installationId,
              anonymousUserData: {
                id: anonymousUser.id,
                email: anonymousUser.email,
                installationId: anonymousUser.installationId,
              },
            },
          );

          try {
            // Link users in our backend
            await userService.linkUsers(anonymousUser.id, newUser.id);
            logger.app.debug(
              'Successfully linked anonymous user with newly created registered user in backend',
              {
                anonymousUserId: anonymousUser.id,
                registeredUserId: newUser.id,
              },
            );

            // Fetch the updated user profile after linking
            const updatedUser = await userService.getUserProfile(newUser.id);
            if (updatedUser) {
              setUser(updatedUser);
              // Sync subscription state after linking
              await syncSubscriptionState(
                async (userId: string, plan: SubscriptionTier) => {
                  await userService.updateUserPlan(userId, plan);
                  setUser({
                    ...updatedUser,
                    plan,
                    getDailyMessageLimit: () => getPlanLimits(plan),
                  });
                },
                setUser,
                updatedUser,
              );
            }
          } catch (error) {
            logger.app.error(
              'Failed to link anonymous user with newly created registered user',
              {
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
                anonymousUserId: anonymousUser.id,
                registeredUserId: newUser.id,
                installationId,
              },
            );
            throw new Error(
              'Failed to link anonymous user with provider account. Please try again.',
            );
          }
        }

        setUserId(firebaseUser.uid);
        await AsyncStorage.setItem('@charmr/userId', firebaseUser.uid);
        setUser(newUser);
        setIsAuthenticated(true);
        await AsyncStorage.setItem('@charmr/isAuthenticated', 'true');

        logger.app.debug('Provider Login Success', {
          event: 'provider_login_success',
          userId: firebaseUser.uid,
          email: firebaseUser.email,
          wasAnonymous: !!anonymousUser,
          anonymousUserId: anonymousUser?.id,
        });
      }
    } catch (error) {
      logger.auth.error('Error in provider login:', error);
      throw error;
    }
  };

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
        logger.app.debug('🚀 Starting app initialization...');

        // Check authentication state
        const storedIsAuthenticated = await AsyncStorage.getItem(
          '@charmr/isAuthenticated',
        );
        const storedUserId = await AsyncStorage.getItem('@charmr/userId');
        const storedUser = await AsyncStorage.getItem('@charmr/user');

        logger.app.debug('🔍 Checking authentication state:', {
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
              logger.app.debug(
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
              logger.app.debug('✅ User is authenticated');
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
              logger.app.debug(
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

  const updateUserPlan = async (plan: SubscriptionTier) => {
    try {
      if (!userId) {
        throw new Error('No user ID available');
      }
      await userService.updateUserPlan(userId, plan);
      setUser({
        ...user,
        plan,
        getDailyMessageLimit: () => getPlanLimits(plan),
      });
      logger.app.debug('User Plan Updated', {
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
      logger.app.debug('Match Updated', {
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
        logger.app.debug('Match Removed', {
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

      logger.app.debug('Anonymous User Linked', {
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
        email: '',
        name: '',
        installationId: '',
        createdAt: new Date().toISOString(),
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

      logger.app.debug('Successfully signed out and cleared all data');
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
        email: '',
        name: '',
        installationId: '',
        createdAt: new Date().toISOString(),
      });
      setIsAuthenticated(false);
      setMatches([]);
      setSelectedMatch(null);
    }
  };

  useEffect(() => {
    // Set up subscription update handler
    setSubscriptionUpdateCallback(async info => {
      if (user) {
        const hasProAccess = info.entitlements.active['Pro']?.isActive;
        if (!hasProAccess && user.plan === SubscriptionTier.PRO) {
          // If user no longer has pro access, update their plan
          await updateUserPlan(SubscriptionTier.FREE);
          setUser({
            ...user,
            plan: SubscriptionTier.FREE,
            getDailyMessageLimit: () => getPlanLimits(SubscriptionTier.FREE),
          });
        }
      }
    });
  }, [user, setUser, updateUserPlan]);

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
      handleProviderLogin,
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
      handleProviderLogin,
    ],
  );

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
};
