import AsyncStorage from '@react-native-async-storage/async-storage';
import {useEffect, useState} from 'react';
import {getAuthToken} from '../config/firebase';
import {installationService} from '../services/installationService';
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
    AsyncStorage.setItem('user', JSON.stringify(updatedUser));
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
          const storedUserId = await AsyncStorage.getItem('userId');
          const storedIsAuthenticated = await AsyncStorage.getItem(
            'isAuthenticated',
          );

          if (storedUserId && storedIsAuthenticated === 'true') {
            setUserId(storedUserId);
            setIsAuthenticated(true);

            // Fetch the full user profile from backend
            const userProfile = await userService.getUserProfile(storedUserId);
            console.log('Fetched user profile:', userProfile); // DEBUG LOG
            if (userProfile) {
              setUser(userProfile);
              console.log('Set user to:', userProfile); // DEBUG LOG
            }
          }
        } catch (error) {
          logger.auth.error('Error initializing state:', error);
        }
      };

      initializeState();
    }
  }, [skipInitialization]);

  const handleGoogleLogin = async (firebaseUser: any) => {
    try {
      logger.auth.info('🔐 Starting Google login process...');

      // Get the installation ID directly from the service
      const installationId = await installationService.getInstallationId();
      logger.auth.info('Got installation ID', {installationId});

      // Ensure we have a valid Firebase token before proceeding
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Failed to get Firebase token after login');
      }

      // First check if this Firebase user already exists in our backend
      try {
        const existingUser = await userService.getUserProfile(firebaseUser.uid);
        if (existingUser) {
          logger.auth.info('Found existing user, updating local state', {
            userId: firebaseUser.uid,
            email: firebaseUser.email,
          });

          // Update local state with the existing user
          setUserId(firebaseUser.uid);
          await AsyncStorage.setItem('userId', firebaseUser.uid);
          setUser(existingUser);
          setIsAuthenticated(true);
          await AsyncStorage.setItem('isAuthenticated', 'true');
          logger.app.info('Google Login Success', {
            event: 'google_login_success',
            userId: firebaseUser.uid,
            email: firebaseUser.email,
          });
          return;
        }
      } catch (error) {
        // If user not found, continue with the flow
        logger.auth.info(
          'No existing user found, continuing with creation/linking',
        );
      }

      // Check if there's an anonymous user with this installation ID
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
          installationId,
        });
      } catch (error) {
        logger.auth.warn('Error finding anonymous user:', {
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined,
          installationId,
        });
        // Continue with user creation if we can't find the anonymous user
      }

      if (anonymousUser) {
        logger.auth.info(
          'Found anonymous user, attempting to link with registered user',
          {
            anonymousUserId: anonymousUser.id,
            registeredUserId: firebaseUser.uid,
            anonymousUserEmail: anonymousUser.email,
            registeredUserEmail: firebaseUser.email,
            installationId,
          },
        );

        try {
          await userService.linkUsers(anonymousUser.id, firebaseUser.uid);
          logger.auth.info('Successfully linked anonymous user', {
            anonymousUserId: anonymousUser.id,
            registeredUserId: firebaseUser.uid,
            installationId,
          });

          // Update local state with the linked user
          setUserId(firebaseUser.uid);
          await AsyncStorage.setItem('userId', firebaseUser.uid);
          setIsAuthenticated(true);
          await AsyncStorage.setItem('isAuthenticated', 'true');
          logger.app.info('Google Login Success', {
            event: 'google_login_success',
            userId: firebaseUser.uid,
            email: firebaseUser.email,
            wasAnonymous: true,
            anonymousUserId: anonymousUser.id,
          });
          return;
        } catch (error) {
          logger.auth.error('Failed to link anonymous user:', {
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
            anonymousUserId: anonymousUser.id,
            registeredUserId: firebaseUser.uid,
            installationId,
          });
          // Continue with user creation if linking fails
        }
      }

      // Create a new user in our backend with Firebase user info
      logger.auth.info('👤 Creating new user...', {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName,
      });

      let newUser;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          newUser = await userService.createUser({
            id: firebaseUser.uid,
            email: firebaseUser.email || `${firebaseUser.uid}@example.com`,
            name: firebaseUser.displayName || `User ${firebaseUser.uid}`,
            installationId,
          });
          break;
        } catch (error) {
          retryCount++;
          if (retryCount === maxRetries) {
            throw error;
          }
          logger.auth.warn(`Retry ${retryCount} creating user...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }

      if (!newUser) {
        throw new Error('Failed to create user after retries');
      }

      // Verify the user was created by fetching their profile
      try {
        const verifiedUser = await userService.getUserProfile(firebaseUser.uid);
        if (!verifiedUser) {
          throw new Error('User creation verification failed');
        }
        newUser = verifiedUser;
      } catch (error) {
        logger.auth.error('Failed to verify user creation:', error);
        throw new Error('Failed to verify user creation');
      }

      // Update local state with the new user
      setUserId(firebaseUser.uid);
      await AsyncStorage.setItem('userId', firebaseUser.uid);
      setUser(newUser);
      setIsAuthenticated(true);
      await AsyncStorage.setItem('isAuthenticated', 'true');
      logger.app.info('Google Login Success', {
        event: 'google_login_success',
        userId: firebaseUser.uid,
        email: firebaseUser.email,
      });
    } catch (error) {
      logger.app.error('Google Login Error', {
        event: 'google_login_error',
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
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
