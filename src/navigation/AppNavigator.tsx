import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import React, {useEffect, useRef} from 'react';
import {DeepLinkHandler} from '../components/DeepLinkHandler';
import {LoadingState, Screen} from '../design-system';
import CoachChatScreen from '../screens/CoachChatScreen';
import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import {useStore} from '../store/StoreProvider';
import {logger} from '../utils/logger';
import {RootStackParamList} from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  const {isAuthenticated, isLoading} = useStore();
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (isInitializedRef.current) {
      return;
    }
    isInitializedRef.current = true;

    logger.app.debug('🔄 AppNavigator mounted', {
      isAuthenticated,
      isLoading,
    });

    return () => {
      logger.app.debug('🔄 AppNavigator unmounted');
      isInitializedRef.current = false;
    };
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={isAuthenticated ? 'Home' : 'Login'}
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}>
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="CoachChat"
          component={CoachChatScreen}
          options={{
            headerShown: false,
            headerTransparent: true,
            headerShadowVisible: false,
          }}
        />
      </Stack.Navigator>
      <DeepLinkHandler />
    </NavigationContainer>
  );
};

export default AppNavigator;
