import AsyncStorage from '@react-native-async-storage/async-storage';
import {useEffect, useState} from 'react';
import {getAuthToken} from '../config/firebase';
import {installationService} from '../services/installationService';
import {syncSubscriptionState} from '../services/revenueCatService';
import * as userService from '../services/userService';
import {useStore} from '../store/StoreProvider';
import {User} from '../types/user';
import {logger} from '../utils/logger';
import {getPlanLimits} from '../utils/planLimits';
import {createDefaultUser, shouldResetDailyCount} from '../utils/storeUtils';

export const useStoreState = (skipInitialization = false) => {
  const store = useStore();
  const [userId, setUserId] = useState('');
  const [user, setUserState] = useState<User>(createDefaultUser());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Add debug logging for authentication state changes
  useEffect(() => {
    if (typeof isAuthenticated !== 'undefined') {
      logger.app.info('Auth State Changed', {
        event: 'auth_state_change',
        isAuthenticated,
        userId,
      });
    }
  }, [isAuthenticated, userId]);

  const setUser = (newUser: Partial<User>) => {
    const updatedUser = {
      ...user,
      ...newUser,
      getDailyMessageLimit: () => getPlanLimits(newUser.plan || user.plan),
    };
    setUserState(updatedUser);
    AsyncStorage.setItem('@charmr/user', JSON.stringify(updatedUser));
  };

  // Check and reset daily message count
  useEffect(() => {
    const checkAndResetDailyCount = () => {
      if (shouldResetDailyCount(user.lastResetDate)) {
        setUser({
          dailyMessagesUsed: 0,
          lastResetDate: new Date().toISOString().split('T')[0],
        });
      }
    };

    // Check on mount and every minute
    checkAndResetDailyCount();
    const interval = setInterval(checkAndResetDailyCount, 60000);

    return () => clearInterval(interval);
  }, [user.lastResetDate]);

  // Only run initialization if not skipped
  useEffect(() => {
    if (!skipInitialization) {
      const initializeState = async () => {
        try {
          const storedUserId = await AsyncStorage.getItem('@charmr/userId');
          const storedIsAuthenticated = await AsyncStorage.getItem(
            '@charmr/isAuthenticated',
          );
          const storedUser = await AsyncStorage.getItem('@charmr/user');

          // If we have stored user details but no auth state, restore the auth state
          if (storedUser && (!storedUserId || !storedIsAuthenticated)) {
            const userData = JSON.parse(storedUser);
            if (userData.id) {
              logger.app.info('Restoring auth state from stored user data', {
                userId: userData.id,
              });
              setUserId(userData.id);
              setIsAuthenticated(true);
              setUserState(userData);
              await AsyncStorage.setItem('@charmr/userId', userData.id);
              await AsyncStorage.setItem('@charmr/isAuthenticated', 'true');
              setIsLoading(false);
              return;
            }
          }

          // Normal auth state initialization
          if (storedUserId && storedIsAuthenticated === 'true') {
            setUserId(storedUserId);
            setIsAuthenticated(true);

            // Fetch the full user profile from backend
            const userProfile = await userService.getUserProfile(storedUserId);
            if (userProfile) {
              setUser(userProfile);
            }
          }
        } catch (error) {
          logger.auth.error('Error initializing state:', error);
        } finally {
          setIsLoading(false);
        }
      };

      initializeState();
    } else {
      setIsLoading(false);
    }
  }, [skipInitialization]);

  const handleGoogleLogin = async (firebaseUser: any) => {
    try {
      logger.auth.info('🔐 Starting Google login process...', {
        firebaseUser: {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          providerId: firebaseUser.providerId,
          isAnonymous: firebaseUser.isAnonymous,
        },
      });

      // Get the installation ID directly from the service
      const installationId = await installationService.getInstallationId();
      logger.auth.info('Got installation ID', {installationId});

      // Ensure we have a valid Firebase token before proceeding
      const token = await getAuthToken();
      if (!token) {
        logger.auth.error('Failed to get Firebase token after login');
        throw new Error('Failed to get Firebase token after login');
      }
      logger.auth.info('Successfully obtained Firebase token');

      // First, check if there's an anonymous user with this installation ID
      let anonymousUser = null;
      try {
        logger.auth.info(
          '🔍 Searching for anonymous user with installation ID',
          {
            installationId,
            firebaseUserId: firebaseUser.uid,
          },
        );
        anonymousUser = await userService.findUserByInstallationId(
          installationId,
        );
        logger.auth.info('Anonymous user search result', {
          found: !!anonymousUser,
          anonymousUserId: anonymousUser?.id,
          anonymousUserData: anonymousUser
            ? {
                id: anonymousUser.id,
                email: anonymousUser.email,
                installationId: anonymousUser.installationId,
              }
            : null,
          installationId,
        });
      } catch (error) {
        logger.auth.warn('Error finding anonymous user:', {
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined,
          installationId,
        });
      }

      // Check if user exists in our backend
      logger.auth.info('Checking if user exists in backend', {
        userId: firebaseUser.uid,
      });

      let existingUser;
      try {
        existingUser = await userService.getUserProfile(firebaseUser.uid);
      } catch (error: any) {
        logger.app.error('API Response Error', {
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined,
          response: error.response,
        });
        logger.app.error('Failed to get user profile:', error);
      }

      // If user exists, update local state
      if (existingUser) {
        logger.auth.info('Found existing user, updating local state', {
          userId: firebaseUser.uid,
          email: existingUser.email,
          existingUserData: {
            id: existingUser.id,
            email: existingUser.email,
            installationId: existingUser.installationId,
          },
        });

        setUserId(firebaseUser.uid);
        await AsyncStorage.setItem('@charmr/userId', firebaseUser.uid);
        setUser(existingUser);
        setIsAuthenticated(true);
        await AsyncStorage.setItem('@charmr/isAuthenticated', 'true');
        logger.app.info('Google Login Success', {
          event: 'google_login_success',
          userId: firebaseUser.uid,
          email: firebaseUser.email,
        });
        return existingUser;
      }

      // If no existing user found, create one
      if (!existingUser) {
        logger.app.info('No existing user found, creating new user', {
          firebaseUserId: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName,
        });

        // Create the registered user in our backend
        const newUser = await userService.createUser({
          id: firebaseUser.uid,
          email: firebaseUser.email!,
          name: firebaseUser.displayName || 'User',
          installationId,
        });

        logger.app.info('Created new registered user in backend', {
          userId: newUser.id,
          email: newUser.email,
        });

        // Now try to link if we found an anonymous user
        if (anonymousUser && anonymousUser.id !== newUser.id) {
          logger.app.info(
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
            logger.app.info(
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
                async (userId, plan) => {
                  await userService.updateUserPlan(userId, plan);
                  setUser({
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
              'Failed to link anonymous user with Google account. Please try again.',
            );
          }
        }

        // Update local state
        setUserId(firebaseUser.uid);
        await AsyncStorage.setItem('@charmr/userId', firebaseUser.uid);
        setUser(newUser);
        setIsAuthenticated(true);
        await AsyncStorage.setItem('@charmr/isAuthenticated', 'true');

        logger.app.info('Google Login Success', {
          event: 'google_login_success',
          userId: firebaseUser.uid,
          email: firebaseUser.email,
          wasAnonymous: !!anonymousUser,
          anonymousUserId: anonymousUser?.id,
        });

        return newUser;
      }
    } catch (error) {
      logger.app.error('Google Login Error', {
        event: 'google_login_error',
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        errorDetails: error,
      });
      throw error;
    }
  };

  return {
    userId,
    setUserId,
    user,
    setUser,
    isAuthenticated,
    setIsAuthenticated,
    isLoading,
    setIsLoading,
    handleGoogleLogin,
  };
};
