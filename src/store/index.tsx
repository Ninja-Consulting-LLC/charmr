import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import React, {createContext, useContext, useEffect, useState} from 'react';
import {config} from '../config/config';
import {fetchUserData} from '../services/api';
import {SubscriptionTier} from '../types/enums';
import {User} from '../types/user';
import {getPlanLimits} from '../utils/planLimits';

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
  createNewUser: () => Promise<void>;
  linkAnonymousUser: (registeredUserId: string) => Promise<void>;
  handleGoogleLogin: (firebaseUser: any) => Promise<void>;
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
    extraMessages: 0,
    lastResetDate: new Date().toISOString(),
    getDailyMessageLimit: () => getPlanLimits(SubscriptionTier.FREE),
  },
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
    extraMessages: 0,
    lastResetDate: new Date().toISOString(),
    getDailyMessageLimit: () => getPlanLimits(SubscriptionTier.FREE),
  });

  // Set auth bypass in development mode
  useEffect(() => {
    if (__DEV__ || process.env.NODE_ENV === 'development') {
      setAuthBypass(true);
    }
  }, []);

  const syncUserWithBackend = async (userId: string) => {
    try {
      const userData = await fetchUserData(userId);
      if (userData) {
        setUserState({
          ...userData,
          getDailyMessageLimit: () => getPlanLimits(userData.plan),
        });
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        console.log('Synced user data with backend:', userData);
      }
    } catch (error) {
      console.error('Error syncing user data:', error);
    }
  };

  const setUser = (newUser: Partial<User>) => {
    const updatedUser = {
      ...user,
      ...newUser,
      getDailyMessageLimit: () => getPlanLimits(newUser.plan || user.plan),
    };
    setUserState(updatedUser);
    AsyncStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const updateUserPlan = async (plan: SubscriptionTier) => {
    try {
      if (!userId) {
        throw new Error('No user ID available');
      }

      // Update backend
      await axios.put(
        `${config.apiBaseUrl}/api/users/${userId}/plan`,
        {plan},
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Auth-Bypass': 'true', // For development only
          },
        },
      );

      // Update local state
      setUser({
        plan,
        getDailyMessageLimit: () => getPlanLimits(plan),
      });
    } catch (error) {
      console.error('Error updating user plan:', error);
      throw error;
    }
  };

  // Get or create user ID and load user data on component mount
  useEffect(() => {
    const initUser = async () => {
      try {
        // Get stored user ID if it exists
        const storedUserId = await AsyncStorage.getItem('userId');
        if (storedUserId) {
          setUserId(storedUserId);
          // Try to sync with backend
          const userData = await fetchUserData(storedUserId);
          if (userData) {
            setUser({
              ...userData,
              getDailyMessageLimit: () => getPlanLimits(userData.plan),
            });
          }
        }
      } catch (error) {
        console.error('Error initializing user:', error);
      }
    };

    initUser();
  }, [userId]);

  const createNewUser = async () => {
    try {
      // First check if we have a stored user ID
      const storedUserId = await AsyncStorage.getItem('userId');
      if (storedUserId) {
        // Try to fetch the stored user
        try {
          const checkResponse = await fetch(
            `${config.apiBaseUrl}/api/users/${storedUserId}`,
            {
              headers: {
                'X-Auth-Bypass': 'true', // For development only
              },
            },
          );

          if (checkResponse.ok) {
            // User exists, use their data
            const existingUserData = await checkResponse.json();
            setUserId(storedUserId);
            setUser({
              ...existingUserData,
              getDailyMessageLimit: () => getPlanLimits(existingUserData.plan),
            });
            await AsyncStorage.setItem(
              'user',
              JSON.stringify(existingUserData),
            );
            return;
          }
        } catch (error) {
          // If there's an error fetching the stored user, we'll create a new one
          console.log('Error fetching stored user, creating new one:', error);
        }
      }

      // Create new user
      const newUserId = `user-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      setUserId(newUserId);
      await AsyncStorage.setItem('userId', newUserId);

      // Create user in backend
      const response = await fetch(`${config.apiBaseUrl}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Bypass': 'true', // For development only
        },
        body: JSON.stringify({
          id: newUserId,
          email: `${newUserId}@example.com`,
          name: `User ${newUserId}`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }

      const userData = await response.json();

      // Wait for the user to be created in the backend
      let retries = 0;
      let userCreated = false;

      while (retries < 5 && !userCreated) {
        try {
          const fetchResponse = await fetch(
            `${config.apiBaseUrl}/api/users/${newUserId}`,
            {
              headers: {
                'X-Auth-Bypass': 'true', // For development only
              },
            },
          );

          if (fetchResponse.ok) {
            userCreated = true;
            const fetchedUserData = await fetchResponse.json();
            setUser({
              ...fetchedUserData,
              getDailyMessageLimit: () => getPlanLimits(fetchedUserData.plan),
            });
            // Store the complete user data in AsyncStorage
            await AsyncStorage.setItem('user', JSON.stringify(fetchedUserData));
          } else {
            retries++;
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (error) {
          retries++;
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      if (!userCreated) {
        throw new Error('Failed to verify user creation');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  };

  const linkAnonymousUser = async (registeredUserId: string) => {
    try {
      if (!userId) {
        throw new Error('No anonymous user ID available');
      }

      // Link the users in the backend
      const response = await fetch(`${config.apiBaseUrl}/api/users/link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Bypass': 'true', // For development only
        },
        body: JSON.stringify({
          anonymousUserId: userId,
          registeredUserId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to link users');
      }

      // Update the frontend to use the new user ID
      setUserId(registeredUserId);
      await AsyncStorage.setItem('userId', registeredUserId);

      // Fetch the updated user data
      const userData = await fetchUserData(registeredUserId);
      if (userData) {
        setUser({
          ...userData,
          getDailyMessageLimit: () => getPlanLimits(userData.plan),
        });
      }
    } catch (error) {
      console.error('Error linking users:', error);
      throw error;
    }
  };

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

  const handleGoogleLogin = async (firebaseUser: any) => {
    try {
      // Create a new user in our backend with Firebase user info
      const response = await fetch(`${config.apiBaseUrl}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Bypass': 'true', // For development only
        },
        body: JSON.stringify({
          id: firebaseUser.uid,
          email: firebaseUser.email || `${firebaseUser.uid}@example.com`,
          name: firebaseUser.displayName || `User ${firebaseUser.uid}`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user in backend');
      }

      const userData = await response.json();

      // If we have an anonymous user ID, link it with the new registered user
      if (userId && userId !== firebaseUser.uid) {
        const linkResponse = await fetch(
          `${config.apiBaseUrl}/api/users/link`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Auth-Bypass': 'true', // For development only
            },
            body: JSON.stringify({
              anonymousUserId: userId,
              registeredUserId: firebaseUser.uid,
            }),
          },
        );

        if (!linkResponse.ok) {
          const errorData = await linkResponse.json();
          throw new Error(errorData.error || 'Failed to link users');
        }
      }

      // Update local state with the new user
      setUserId(firebaseUser.uid);
      await AsyncStorage.setItem('userId', firebaseUser.uid);
      setUser({
        ...userData,
        getDailyMessageLimit: () => getPlanLimits(userData.plan),
      });
      setIsAuthenticated(true);
      await AsyncStorage.setItem('isAuthenticated', 'true');
    } catch (error) {
      console.error('Error in Google login:', error);
      throw error;
    }
  };

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
    createNewUser,
    linkAnonymousUser,
    handleGoogleLogin,
  };

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
};
