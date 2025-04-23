import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {createContext, useContext, useEffect, useState} from 'react';

interface User {
  id: string;
  email?: string;
  plan: 'free' | 'plus' | 'premium';
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
    plan: 'free',
    dailyMessagesUsed: 0,
    dailyMessageLimit: 5,
    extraMessages: 0,
    lastResetDate: new Date().toISOString().split('T')[0],
  },
  setUser: () => {},
  isAuthenticated: false,
  setIsAuthenticated: () => {},
  isLoading: true,
  setIsLoading: () => {},
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
  const [user, setUserState] = useState<User>({
    id: '',
    plan: 'free',
    dailyMessagesUsed: 0,
    dailyMessageLimit: 5,
    extraMessages: 0,
    lastResetDate: new Date().toISOString().split('T')[0],
  });

  // Set auth bypass in development mode
  useEffect(() => {
    if (__DEV__ || process.env.NODE_ENV === 'development') {
      setAuthBypass(true);
    }
  }, []);

  const setUser = (newUser: Partial<User>) => {
    setUserState(prev => {
      const updatedUser = {...prev, ...newUser};
      // Persist user data to AsyncStorage
      AsyncStorage.setItem('userData', JSON.stringify(updatedUser)).catch(
        error => console.error('Error saving user data:', error),
      );
      return updatedUser;
    });
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
            setUserState({
              ...parsedUserData,
              dailyMessagesUsed: 0,
              lastResetDate: today,
            });
          } else {
            setUserState(parsedUserData);
          }
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
  };

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
};
