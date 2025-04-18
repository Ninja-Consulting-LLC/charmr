import React, {createContext, useContext, useState} from 'react';

// Define the store state and methods
interface Store {
  showKeyboardModal: boolean;
  setShowKeyboardModal: (show: boolean) => void;
}

// Create context with a default value
const StoreContext = createContext<Store>({
  showKeyboardModal: false,
  setShowKeyboardModal: () => {},
});

// Custom hook to use the store
export const useStore = () => useContext(StoreContext);

// Provider component
export const StoreProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const [showKeyboardModal, setShowKeyboardModal] = useState(false);

  const value = {
    showKeyboardModal,
    setShowKeyboardModal,
  };

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
};
