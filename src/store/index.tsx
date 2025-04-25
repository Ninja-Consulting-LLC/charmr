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

  // Add version key for detecting backend resets
  const BACKEND_VERSION_KEY = 'backend_version';
  const CURRENT_BACKEND_VERSION = '1.0.0';

  // Cleanup function to handle stale data
  const cleanupStaleData = async () => {
    try {
      await AsyncStorage.removeItem('userId');
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('isAuthenticated');
      setUserId('');
      setUser({
        id: '',
        plan: SubscriptionTier.FREE,
        dailyMessagesUsed: 0,
        extraMessages: 0,
        lastResetDate: new Date().toISOString(),
        getDailyMessageLimit: () => getPlanLimits(SubscriptionTier.FREE),
      });
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error cleaning up stale data:', error);
    }
  };

  // Check backend version and cleanup if needed
  const checkBackendVersion = async () => {
    try {
      const storedVersion = await AsyncStorage.getItem(BACKEND_VERSION_KEY);
      if (storedVersion !== CURRENT_BACKEND_VERSION) {
        // Backend has been reset or version changed
        await cleanupStaleData();
        await AsyncStorage.setItem(
          BACKEND_VERSION_KEY,
          CURRENT_BACKEND_VERSION,
        );
      }
    } catch (error) {
      console.error('Error checking backend version:', error);
    }
  };

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
        // First check backend version
        await checkBackendVersion();

        // Get stored user ID if it exists
        const storedUserId = await AsyncStorage.getItem('userId');
        if (storedUserId) {
          try {
            // Verify user exists in backend
            const userData = await fetchUserData(storedUserId);
            if (userData) {
              setUserId(storedUserId);
              setUser({
                ...userData,
                getDailyMessageLimit: () => getPlanLimits(userData.plan),
              });
              return;
            }
          } catch (error) {
            console.log('Error fetching stored user, cleaning up:', error);
            await cleanupStaleData();
          }
        }

        // If we get here, either no stored user or user doesn't exist in backend
        await createNewUser();
      } catch (error) {
        console.error('Error initializing user:', error);
        // If initialization fails, clean up and try again
        await cleanupStaleData();
        await createNewUser();
      }
    };

    initUser();
  }, []);

  const createNewUser = async () => {
    try {
      // First check if we have a stored user ID
      const storedUserId = await AsyncStorage.getItem('userId');
      if (storedUserId) {
        // Try to fetch the stored user
        try {
          const {data: existingUserData} = await axios.get(
            `${config.apiBaseUrl}/api/users/${storedUserId}`,
            {
              headers: {
                'X-Auth-Bypass': 'true', // For development only
              },
            },
          );

          // User exists, use their data
          setUserId(storedUserId);
          setUser({
            ...existingUserData,
            getDailyMessageLimit: () => getPlanLimits(existingUserData.plan),
          });
          await AsyncStorage.setItem('user', JSON.stringify(existingUserData));
          return;
        } catch (error) {
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
      const {data: userData} = await axios.post(
        `${config.apiBaseUrl}/api/users`,
        {
          id: newUserId,
          email: `${newUserId}@example.com`,
          name: `User ${newUserId}`,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Auth-Bypass': 'true', // For development only
          },
        },
      );

      // Wait for the user to be created in the backend with retries
      let retries = 0;
      let userCreated = false;

      while (retries < 10 && !userCreated) {
        try {
          const {data: fetchedUserData} = await axios.get(
            `${config.apiBaseUrl}/api/users/${newUserId}`,
            {
              headers: {
                'X-Auth-Bypass': 'true', // For development only
              },
            },
          );

          userCreated = true;
          setUser({
            ...fetchedUserData,
            getDailyMessageLimit: () => getPlanLimits(fetchedUserData.plan),
          });
          await AsyncStorage.setItem('user', JSON.stringify(fetchedUserData));
          break;
        } catch (error) {
          console.log(`Retry ${retries + 1} failed:`, error);
        }
        retries++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (!userCreated) {
        throw new Error(
          'Failed to verify user creation after multiple retries',
        );
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
      // First check if a user exists with this email
      try {
        const {data: existingUserData} = await axios.get(
          `${config.apiBaseUrl}/api/users/email/${encodeURIComponent(
            firebaseUser.email,
          )}`,
          {
            headers: {
              'X-Auth-Bypass': 'true', // For development only
            },
          },
        );

        // User exists with this email, use their account
        setUserId(existingUserData.id);
        await AsyncStorage.setItem('userId', existingUserData.id);
        setUser({
          ...existingUserData,
          getDailyMessageLimit: () => getPlanLimits(existingUserData.plan),
        });
        await AsyncStorage.setItem('user', JSON.stringify(existingUserData));
        setIsAuthenticated(true);
        await AsyncStorage.setItem('isAuthenticated', 'true');
        return;
      } catch (error) {
        // User doesn't exist with this email, continue with creation
        console.log('No existing user found with this email:', error);
      }

      // If we have an anonymous user ID, link it with the new registered user
      if (userId && userId !== firebaseUser.uid) {
        try {
          await axios.post(
            `${config.apiBaseUrl}/api/users/link`,
            {
              anonymousUserId: userId,
              registeredUserId: firebaseUser.uid,
            },
            {
              headers: {
                'Content-Type': 'application/json',
                'X-Auth-Bypass': 'true', // For development only
              },
            },
          );
        } catch (error) {
          console.error('Error linking users:', error);
          throw new Error('Failed to link users');
        }
      }

      // Create a new user in our backend with Firebase user info
      const {data: userData} = await axios.post(
        `${config.apiBaseUrl}/api/users`,
        {
          id: firebaseUser.uid,
          email: firebaseUser.email || `${firebaseUser.uid}@example.com`,
          name: firebaseUser.displayName || `User ${firebaseUser.uid}`,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Auth-Bypass': 'true', // For development only
          },
        },
      );

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
