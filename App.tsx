/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import React, {useEffect, useState} from 'react';
import {StatusBar, View} from 'react-native';
import {PaperProvider} from 'react-native-paper';
import AppNavigator from './src/navigation/AppNavigator';
import {RootStackParamList} from './src/navigation/types';
import {StoreProvider} from './src/store';
import {theme} from './src/theme/theme';

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

    console.log('🔥 Configuring Google Sign-In');

    GoogleSignin.configure({
      iosClientId:
        '86028540367-p6l58a0nt6rjp0uk90umjmpdfmh92d3n.apps.googleusercontent.com',
      webClientId:
        '86028540367-i6tuu1bh4pkmekqahqdsqv4qj3a6eqvn.apps.googleusercontent.com',
      offlineAccess: false,
    });
  }, []);

  if (!isReady) {
    return <View style={{flex: 1, backgroundColor: theme.colors.background}} />;
  }

  return (
    <PaperProvider theme={theme}>
      <StoreProvider>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={theme.colors.background}
        />
        <AppNavigator initialRouteName={initialRoute} />
      </StoreProvider>
    </PaperProvider>
  );
}

export default App;
