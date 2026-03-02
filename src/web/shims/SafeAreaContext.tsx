import React from 'react';
import {View} from 'react-native';

const getFrame = () => ({
  x: 0,
  y: 0,
  width:
    typeof window !== 'undefined' && window.innerWidth ? window.innerWidth : 0,
  height:
    typeof window !== 'undefined' && window.innerHeight
      ? window.innerHeight
      : 0,
});

export const SafeAreaInsetsContext = React.createContext({
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
});

export const SafeAreaFrameContext = React.createContext(getFrame());

export const SafeAreaProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const [frame, setFrame] = React.useState(getFrame());

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const onResize = () => setFrame(getFrame());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <SafeAreaInsetsContext.Provider
      value={{top: 0, bottom: 0, left: 0, right: 0}}>
      <SafeAreaFrameContext.Provider value={frame}>
        {children}
      </SafeAreaFrameContext.Provider>
    </SafeAreaInsetsContext.Provider>
  );
};

export const SafeAreaView = View;

export const useSafeAreaInsets = () => ({
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
});

export const useSafeAreaFrame = () => ({
  ...getFrame(),
});

export const initialWindowMetrics = {
  insets: {top: 0, bottom: 0, left: 0, right: 0},
  frame: getFrame(),
};
