/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

// TypeScript declaration for Firebase modular API warning control
declare global {
  var RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS: boolean;
}

// Silence React Native Firebase modular API migration warnings
// This can be removed once fully migrated to the modular API
// See: https://rnfirebase.io/migrating-to-v22
globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;

import AsyncStorage from '@react-native-async-storage/async-storage';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import React, {useEffect, useRef, useState} from 'react';
import {Platform, StatusBar} from 'react-native';
import {PaperProvider} from 'react-native-paper';
import {SplashScreen} from './src/components/SplashScreen';
import {config} from './src/config/config';
import AppNavigator from './src/navigation/AppNavigator';
import {pushNotificationService} from './src/services/PushNotificationService';
import {initializeRevenueCat} from './src/services/revenueCatService';
import {StoreProvider} from './src/store/StoreProvider';
import {theme} from './src/theme/theme';
import {logger} from './src/utils/logger';
import {getPlanLimits} from './src/utils/planLimits';

const App = () => {
  const [isReady, setIsReady] = useState(false);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (isInitializedRef.current) {
      return;
    }
    isInitializedRef.current = true;

    const initializeApp = async () => {
      try {
        // ===== App Initialization =====
        logger.app.info('🚀 Starting app initialization...');

        // ===== Service Configuration =====
        logger.app.info('\n🔧 Service Configuration:');

        // Facebook SDK
        try {
          // Initialize Facebook SDK
          if (Platform.OS === 'ios') {
            logger.app.info('  🔐 Configurirng Facebook SDK...');
            // Settings.initializeSDK();
            // Settings.setAppID('512728425163946');
            // Settings.setClientToken('c3cbdb800534d3b92eaba7f6d9c1e25a');
            logger.app.info('  Facebook SDK initialized successfully');
          }
        } catch (error) {
          logger.app.error('  Failed to initialize Facebook SDK:', error);
          throw error; // Re-throw to prevent app from continuing with uninitialized SDK
        }

        // Google Sign-In
        logger.app.info('  🔐 Configuring Google Sign-In...');
        await GoogleSignin.configure({
          webClientId: config.googleWebClientId,
        });

        // RevenueCat
        logger.app.info('  💰 Initializing RevenueCat...');
        await initializeRevenueCat();

        // ===== User State =====
        logger.app.info('\n👤 User State:');

        // Authentication
        const isAuthenticated = await AsyncStorage.getItem(
          '@charmr/isAuthenticated',
        );
        const userId = await AsyncStorage.getItem('@charmr/userId');
        const userData = await AsyncStorage.getItem('@charmr/user');

        const user = userData ? JSON.parse(userData) : null;
        const userDetails = user
          ? {
              email: user.email || 'Not set',
              name: user.name || 'Not set',
              plan: user.plan || 'Free',
              dailyMessagesUsed: user.dailyMessagesUsed || 0,
              dailyMessageLimit: getPlanLimits(user.plan),
              extraMessages: user.extraMessages || 0,
              lastResetDate: user.lastResetDate || 'Never',
            }
          : null;

        logger.app.info('User State', {
          authentication: {
            isAuthenticated,
            userId,
          },
          userDetails,
        });

        // ===== Navigation =====
        const navigationTarget = !isAuthenticated || !userId ? 'Login' : 'Home';
        logger.app.info('\n🛣️ Navigation:');
        logger.app.info('Navigation State', {
          navigationTarget,
        });

        setIsReady(true);
      } catch (error) {
        logger.app.error('\n❌ Error during initialization:', error);
        setIsReady(true); // Still set ready to show error state
      }
    };

    initializeApp();

    const initializePushNotifications = async () => {
      try {
        // Request permission and get token
        const hasPermission = await pushNotificationService.requestPermission();
        if (hasPermission) {
          const token = await pushNotificationService.getToken();
          logger.app.info('Push notification initialized', {token});

          // Set up token refresh handler
          await pushNotificationService.onTokenRefresh(newToken => {
            logger.app.info('FCM token refreshed', {token: newToken});
            // TODO: Send new token to your backend
          });

          // Set up message handlers
          await pushNotificationService.onMessage(message => {
            logger.app.info('Received foreground message', {message});
            // TODO: Handle foreground message
          });

          await pushNotificationService.onNotificationOpenedApp(message => {
            logger.app.info('App opened from background', {message});
            // TODO: Handle notification opened from background
          });

          // Check if app was opened from a notification
          const initialNotification =
            await pushNotificationService.getInitialNotification();
          if (initialNotification) {
            logger.app.info('App opened from quit state', {
              message: initialNotification,
            });
            // TODO: Handle initial notification
          }
        }
      } catch (error) {
        logger.app.error('Failed to initialize push notifications:', error);
      }
    };

    initializePushNotifications();

    return () => {
      isInitializedRef.current = false;
    };
  }, []); // Empty dependency array ensures this runs only once

  if (!isReady) {
    return <SplashScreen />;
  }

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
