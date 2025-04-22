import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {createContext, useContext, useEffect, useState} from 'react';

interface User {
  email?: string;
  plan: 'free' | 'plus' | 'premium';
  dailyMessagesUsed: number;
  dailyMessageLimit: number;
  extraMessages: number;
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
    plan: 'free',
    dailyMessagesUsed: 0,
    dailyMessageLimit: 5,
    extraMessages: 0,
  },
  setUser: () => {},
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
  const [user, setUserState] = useState<User>({
    plan: 'free',
    dailyMessagesUsed: 0,
    dailyMessageLimit: 5,
    extraMessages: 0,
  });

  const setUser = (newUser: Partial<User>) => {
    setUserState(prev => ({...prev, ...newUser}));
  };

  // Get or create user ID on component mount
  useEffect(() => {
    const getOrCreateUserId = async () => {
      try {
        let storedUserId = await AsyncStorage.getItem('userId');
        if (!storedUserId) {
          // Generate a new user ID if none exists
          storedUserId = `user-${Date.now()}-${Math.random()
            .toString(36)
            .substr(2, 9)}`;
          await AsyncStorage.setItem('userId', storedUserId);
        }
        setUserId(storedUserId);
      } catch (error) {
        console.error('Error managing user ID:', error);
      }
    };

    getOrCreateUserId();
  }, []);

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
  };

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
};
