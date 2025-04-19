import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {createContext, useContext, useEffect, useState} from 'react';

// Define the store state and methods
interface Store {
  showKeyboardModal: boolean;
  setShowKeyboardModal: (show: boolean) => void;
  userId: string;
  setUserId: (userId: string) => void;
}

// Create context with a default value
const StoreContext = createContext<Store>({
  showKeyboardModal: false,
  setShowKeyboardModal: () => {},
  userId: '',
  setUserId: () => {},
});

// Custom hook to use the store
export const useStore = () => useContext(StoreContext);

// Provider component
export const StoreProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const [showKeyboardModal, setShowKeyboardModal] = useState(false);
  const [userId, setUserId] = useState('');

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
  };

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
};
