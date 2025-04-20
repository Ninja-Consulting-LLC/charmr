/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {useEffect, useState} from 'react';
import {StatusBar, View} from 'react-native';
import {PaperProvider} from 'react-native-paper';
import AppNavigator from './src/navigation/AppNavigator';
import {RootStackParamList} from './src/navigation/types';
import {StoreProvider} from './src/store';

function App(): React.JSX.Element {
  const [isReady, setIsReady] = useState(false);
  const [initialRoute, setInitialRoute] =
    useState<keyof RootStackParamList>('Login');

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const hasOnboarded = await AsyncStorage.getItem('hasOnboarded');
        const isAuthenticated = await AsyncStorage.getItem('isAuthenticated');

        console.log('App status:', {hasOnboarded, isAuthenticated});

        if (isAuthenticated === 'true') {
          setInitialRoute('Home');
        } else {
          setInitialRoute('Login');
        }
      } catch (error) {
        console.error('Error checking app status:', error);
      } finally {
        setIsReady(true);
      }
    };

    checkOnboardingStatus();
  }, []);

  if (!isReady) {
    return <View style={{flex: 1, backgroundColor: '#fff'}} />;
  }

  return (
    <PaperProvider>
      <StoreProvider>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <AppNavigator initialRouteName={initialRoute} />
      </StoreProvider>
    </PaperProvider>
  );
}

export default App;
