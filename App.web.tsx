import React from 'react';
import {StatusBar} from 'react-native';
import {PaperProvider} from 'react-native-paper';
import AppNavigator from './src/navigation/AppNavigator';
import {StoreProvider} from './src/store/StoreProvider';
import {theme} from './src/theme/theme';

const App = () => {
  return (
    <PaperProvider theme={theme}>
      <StatusBar barStyle="light-content" />
      <StoreProvider>
        <AppNavigator />
      </StoreProvider>
    </PaperProvider>
  );
};

export default App;
