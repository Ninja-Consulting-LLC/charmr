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
import Config from 'react-native-config';
import {PaperProvider} from 'react-native-paper';
import AppNavigator from './src/navigation/AppNavigator';
import {RootStackParamList} from './src/navigation/types';
import {initializeRevenueCat} from './src/services/revenueCatService';
import {StoreProvider} from './src/store';
import {theme} from './src/theme/theme';
import {getPlanLimits} from './src/utils/planLimits';

function App(): React.JSX.Element {
  const [isReady, setIsReady] = useState(false);
  const [initialRoute, setInitialRoute] =
    useState<keyof RootStackParamList>('Login');

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        // Initialize RevenueCat
        await initializeRevenueCat();

        // Get stored user data
        const hasOnboarded = await AsyncStorage.getItem('hasOnboarded');
        const isAuthenticated = await AsyncStorage.getItem('isAuthenticated');
        const userId = await AsyncStorage.getItem('userId');
        const userJson = await AsyncStorage.getItem('user');
        const sandboxMode = await AsyncStorage.getItem('sandboxMode');
        const user = userJson ? JSON.parse(userJson) : null;

        // Log user state
        console.log('\n🔍 User State Check:');
        console.log(
          '   Authentication Status:',
          isAuthenticated === 'true'
            ? '✅ Authenticated'
            : '❌ Not Authenticated',
        );
        console.log(
          '   Onboarding Status:',
          hasOnboarded === 'true' ? '✅ Completed' : '❌ Not Completed',
        );
        console.log('   User ID:', userId || 'Not set');
        console.log('   Sandbox Mode:', sandboxMode || 'Not set');

        if (user) {
          console.log('\n👤 User Details:');
          console.log('   Email:', user.email || 'Not set');
          console.log('   Name:', user.name || 'Not set');

          console.log('\n💰 Plan Details:');
          console.log('   Plan:', user.plan || 'Free');
          console.log('   Daily Messages Used:', user.dailyMessagesUsed || 0);
          console.log('   Daily Message Limit:', getPlanLimits(user.plan));
          console.log('   Extra Messages:', user.extraMessages || 0);
          console.log('   Last Reset Date:', user.lastResetDate || 'Never');
        }

        if (isAuthenticated === 'true') {
          console.log('\n🚀 User is authenticated, navigating to Home');
          setInitialRoute('Home');
        } else {
          console.log('\n🔒 User is not authenticated, navigating to Login');
          setInitialRoute('Login');
        }
      } catch (error) {
        console.error('❌ Error checking app status:', error);
      } finally {
        setIsReady(true);
      }
    };

    checkOnboardingStatus();

    console.log('🔥 Configuring Google Sign-In');
    console.log('💰 RevenueCat API Key:', Config.REVENUECAT_DEV_API_KEY);

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
