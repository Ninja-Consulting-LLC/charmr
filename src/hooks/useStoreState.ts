import AsyncStorage from '@react-native-async-storage/async-storage';
import {useEffect, useState} from 'react';
import * as userService from '../services/userService';
import {StoreState} from '../store/types';
import {User} from '../types/user';
import {logger} from '../utils/logger';
import {getPlanLimits} from '../utils/planLimits';
import {createDefaultUser, shouldResetDailyCount} from '../utils/storeUtils';

export const useStoreState = (skipInitialization = false): StoreState => {
  const [userId, setUserId] = useState('');
  const [user, setUserState] = useState<User>(createDefaultUser());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Add debug logging for authentication state changes
  useEffect(() => {
    if (typeof isAuthenticated !== 'undefined') {
      logger.app.debug('Auth State Changed', {
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
              logger.app.debug('Restoring auth state from stored user data', {
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

  return {
    userId,
    setUserId,
    user,
    setUser,
    isAuthenticated,
    setIsAuthenticated,
    isLoading,
    setIsLoading,
  };
};
