import AsyncStorage from '@react-native-async-storage/async-storage';
import installations from '@react-native-firebase/installations';
import {useEffect, useState} from 'react';
import * as userService from '../services/userService';
import {User} from '../types/user';
import {logger} from '../utils/logger';
import {getPlanLimits} from '../utils/planLimits';
import {createDefaultUser, shouldResetDailyCount} from '../utils/storeUtils';

export const useStoreState = (skipInitialization = false) => {
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

      // Get the installation ID
      const installationId = await installations().getId();

      // First check if a user exists with this email
      const existingUser = await userService.findUserByEmail(
        firebaseUser.email,
      );

      if (existingUser) {
        logger.auth.info('👤 Found existing user:', existingUser.id);
        setUserId(existingUser.id);
        await AsyncStorage.setItem('userId', existingUser.id);
        setUser(existingUser);
        setIsAuthenticated(true);
        await AsyncStorage.setItem('isAuthenticated', 'true');
        logger.app.info('Google Login Success', {
          event: 'google_login_success',
          userId: existingUser.id,
          email: existingUser.email,
        });
        return;
      }

      // If we have an anonymous user ID, link it with the new registered user
      if (userId && userId !== firebaseUser.uid) {
        logger.auth.info('🔗 Linking anonymous user with registered user');
        await userService.linkUsers(userId, firebaseUser.uid);
      }

      // Create a new user in our backend with Firebase user info
      logger.auth.info('👤 Creating new user...');
      const newUser = await userService.createUser({
        id: firebaseUser.uid,
        email: firebaseUser.email || `${firebaseUser.uid}@example.com`,
        name: firebaseUser.displayName || `User ${firebaseUser.uid}`,
        installationId,
      });

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
