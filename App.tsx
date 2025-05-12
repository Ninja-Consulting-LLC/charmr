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
import {logger} from './src/utils/logger';
import {getPlanLimits} from './src/utils/planLimits';

function App(): React.JSX.Element {
  const [isReady, setIsReady] = useState(false);
  const [initialRoute, setInitialRoute] =
    useState<keyof RootStackParamList>('Login');

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        logger.app.info('🚀 Starting app initialization...');

        // Initialize RevenueCat
        await initializeRevenueCat();
        logger.app.info('💰 RevenueCat initialized');

        // Get stored user data
        const hasOnboarded = await AsyncStorage.getItem('hasOnboarded');
        const isAuthenticated = await AsyncStorage.getItem('isAuthenticated');
        const userId = await AsyncStorage.getItem('userId');
        const userJson = await AsyncStorage.getItem('user');
        const sandboxMode = await AsyncStorage.getItem('sandboxMode');
        const user = userJson ? JSON.parse(userJson) : null;

        // Log user state
        logger.app.info('\n🔍 User State Check:');
        logger.app.info(
          '   Authentication Status: ' +
            (isAuthenticated === 'true'
              ? '✅ Authenticated'
              : '❌ Not Authenticated'),
        );
        logger.app.info(
          '   Onboarding Status: ' +
            (hasOnboarded === 'true' ? '✅ Completed' : '❌ Not Completed'),
        );
        logger.app.info('   User ID: ' + (userId || 'Not set'));
        logger.app.info('   Sandbox Mode: ' + (sandboxMode || 'Not set'));

        if (user) {
          logger.app.info('\n👤 User Details:');
          logger.app.info('   Email: ' + (user.email || 'Not set'));
          logger.app.info('   Name: ' + (user.name || 'Not set'));

          logger.app.info('\n💰 Plan Details:');
          logger.app.info('   Plan: ' + (user.plan || 'Free'));
          logger.app.info(
            '   Daily Messages Used: ' + (user.dailyMessagesUsed || 0),
          );
          logger.app.info(
            '   Daily Message Limit: ' + getPlanLimits(user.plan),
          );
          logger.app.info('   Extra Messages: ' + (user.extraMessages || 0));
          logger.app.info(
            '   Last Reset Date: ' + (user.lastResetDate || 'Never'),
          );
        }

        if (isAuthenticated === 'true') {
          logger.app.info('\n🚀 User is authenticated, navigating to Home');
          setInitialRoute('Home');
        } else {
          logger.app.info(
            '\n🔒 User is not authenticated, navigating to Login',
          );
          setInitialRoute('Login');
        }
      } catch (error) {
        logger.app.error('❌ Error checking app status:', error);
      } finally {
        setIsReady(true);
      }
    };

    checkOnboardingStatus();

    logger.app.info('🔥 Configuring Google Sign-In');
    logger.app.info('💰 RevenueCat API Key:', Config.REVENUECAT_DEV_API_KEY);

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
