import AsyncStorage from '@react-native-async-storage/async-storage';
import {useEffect, useState} from 'react';
import * as userService from '../services/userService';
import {User} from '../types/user';
import {getPlanLimits} from '../utils/planLimits';
import {createDefaultUser, shouldResetDailyCount} from '../utils/storeUtils';

export const useStoreState = () => {
  const [userId, setUserId] = useState('');
  const [user, setUserState] = useState<User>(createDefaultUser());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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

  const handleGoogleLogin = async (firebaseUser: any) => {
    try {
      // First check if a user exists with this email
      const existingUser = await userService.findUserByEmail(
        firebaseUser.email,
      );
      if (existingUser) {
        setUserId(existingUser.id);
        await AsyncStorage.setItem('userId', existingUser.id);
        setUser(existingUser);
        setIsAuthenticated(true);
        await AsyncStorage.setItem('isAuthenticated', 'true');
        return;
      }

      // If we have an anonymous user ID, link it with the new registered user
      if (userId && userId !== firebaseUser.uid) {
        await userService.linkUsers(userId, firebaseUser.uid);
      }

      // Create a new user in our backend with Firebase user info
      const newUser = await userService.createUser({
        id: firebaseUser.uid,
        email: firebaseUser.email || `${firebaseUser.uid}@example.com`,
        name: firebaseUser.displayName || `User ${firebaseUser.uid}`,
      });

      // Update local state with the new user
      setUserId(firebaseUser.uid);
      await AsyncStorage.setItem('userId', firebaseUser.uid);
      setUser(newUser);
      setIsAuthenticated(true);
      await AsyncStorage.setItem('isAuthenticated', 'true');
    } catch (error) {
      console.error('Error in Google login:', error);
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
