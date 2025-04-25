import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import React, {createContext, useContext, useEffect, useState} from 'react';
import {config} from '../config/config';
import {SubscriptionTier} from '../types/enums';

interface User {
  id: string;
  email?: string;
  plan: SubscriptionTier;
  dailyMessagesUsed: number;
  dailyMessageLimit: number;
  extraMessages: number;
  lastResetDate: string;
}

// Define the store state and methods
interface Store {
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
}

// Create context with a default value
const StoreContext = createContext<Store>({
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
  user: {
    id: '',
    plan: SubscriptionTier.FREE,
    dailyMessagesUsed: 0,
    dailyMessageLimit: 5,
    extraMessages: 0,
    lastResetDate: new Date().toISOString(),
  },
  setUser: () => {},
  isAuthenticated: false,
  setIsAuthenticated: () => {},
  isLoading: true,
  setIsLoading: () => {},
  updateUserPlan: async () => {},
  showUpgradeModal: false,
  setShowUpgradeModal: () => {},
});

// Custom hook to use the store
export const useStore = () => useContext(StoreContext);

// Provider component
export const StoreProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const [showKeyboardModal, setShowKeyboardModal] = useState(false);
  const [userId, setUserId] = useState('');
  const [showDevMenu, setShowDevMenu] = useState(false);
  const [skipRateLimiting, setSkipRateLimiting] = useState(false);
  const [authBypass, setAuthBypass] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [user, setUserState] = useState<User>({
    id: '',
    plan: SubscriptionTier.FREE,
    dailyMessagesUsed: 0,
    dailyMessageLimit: 5,
    extraMessages: 0,
    lastResetDate: new Date().toISOString(),
  });

  // Set auth bypass in development mode
  useEffect(() => {
    if (__DEV__ || process.env.NODE_ENV === 'development') {
      setAuthBypass(true);
    }
  }, []);

  const syncUserWithBackend = async (userId: string, userData: User) => {
    try {
      // First check if user exists
      const response = await axios.get(`${config.apiBaseUrl}/api/admin/users`, {
        headers: {
          Authorization: 'Bearer dev-admin-token',
        },
      });

      const existingUser = response.data.find((u: User) => u.id === userId);

      if (!existingUser) {
        // Create the user if they don't exist
        await axios.post(
          `${config.apiBaseUrl}/api/admin/users`,
          {
            id: userId,
            email: `${userId}@example.com`, // Default email for dev users
            name: `Dev User ${userId.slice(0, 6)}`, // Default name using part of the ID
          },
          {
            headers: {
              Authorization: 'Bearer dev-admin-token',
            },
          },
        );
        console.log('Created dev user in database:', userId);
      }
    } catch (error) {
      console.error('Error syncing dev user:', error);
    }
  };

  const setUser = (newUser: Partial<User>) => {
    const updatedUser = {...user, ...newUser};
    setUserState(updatedUser);
    AsyncStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const updateUserPlan = async (plan: SubscriptionTier) => {
    try {
      // Update backend
      await axios.put(
        `${config.apiBaseUrl}/api/admin/users/${userId}/plan`,
        {plan},
        {
          headers: {
            Authorization: 'Bearer dev-admin-token',
          },
        },
      );

      // Update local state
      const updatedUser = {...user, plan};
      setUserState(updatedUser);
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Error updating user plan:', error);
      throw error;
    }
  };

  // Get or create user ID and load user data on component mount
  useEffect(() => {
    const initializeUserData = async () => {
      try {
        // Get or create user ID
        let storedUserId = await AsyncStorage.getItem('userId');
        if (!storedUserId) {
          storedUserId = `user-${Date.now()}-${Math.random()
            .toString(36)
            .substr(2, 9)}`;
          await AsyncStorage.setItem('userId', storedUserId);
        }
        setUserId(storedUserId);

        // Load user data
        const storedUserData = await AsyncStorage.getItem('userData');
        if (storedUserData) {
          const parsedUserData = JSON.parse(storedUserData);
          // Check if we need to reset the message count
          const today = new Date().toISOString().split('T')[0];
          if (parsedUserData.lastResetDate !== today) {
            const updatedUser = {
              ...parsedUserData,
              dailyMessagesUsed: 0,
              lastResetDate: today,
            };
            setUserState(updatedUser);
            syncUserWithBackend(storedUserId, updatedUser);
          } else {
            setUserState(parsedUserData);
            syncUserWithBackend(storedUserId, parsedUserData);
          }
        } else {
          // Create new user data
          const newUser: User = {
            id: storedUserId,
            plan: SubscriptionTier.FREE,
            dailyMessagesUsed: 0,
            dailyMessageLimit: 5,
            extraMessages: 0,
            lastResetDate: new Date().toISOString(),
          };
          setUserState(newUser);
          syncUserWithBackend(storedUserId, newUser);
        }

        // Check authentication status
        const authStatus = await AsyncStorage.getItem('isAuthenticated');
        setIsAuthenticated(authStatus === 'true');
      } catch (error) {
        console.error('Error initializing user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeUserData();
  }, []);

  // Check and reset daily message count
  useEffect(() => {
    const checkAndResetDailyCount = () => {
      const today = new Date().toISOString().split('T')[0];
      if (user.lastResetDate !== today) {
        setUser({
          dailyMessagesUsed: 0,
          lastResetDate: today,
        });
      }
    };

    // Check on mount and every minute
    checkAndResetDailyCount();
    const interval = setInterval(checkAndResetDailyCount, 60000);

    return () => clearInterval(interval);
  }, [user.lastResetDate]);

  const value = {
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
  };

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
};
