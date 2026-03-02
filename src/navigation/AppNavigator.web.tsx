import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import React, {useEffect, useRef} from 'react';
import {DeepLinkHandler} from '../components/DeepLinkHandler';
import CoachChatScreen from '../screens/CoachChatScreen';
import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import {useStore} from '../store/StoreProvider';
import {RootStackParamList} from './types';

const Stack = createStackNavigator<RootStackParamList>();

const linking = {
  prefixes: [],
  config: {
    screens: {
      Login: 'login',
      Home: 'home',
      Onboarding: 'onboarding',
      CoachChat: 'coach-chat',
    },
  },
};

const AppNavigator = () => {
  const {isAuthenticated} = useStore();
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (isInitializedRef.current) {
      return;
    }
    isInitializedRef.current = true;

    return () => {
      isInitializedRef.current = false;
    };
  }, []);

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator
        initialRouteName={isAuthenticated ? 'Home' : 'Login'}
        screenOptions={{
          headerShown: false,
          animationEnabled: true,
        }}>
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen
          name="CoachChat"
          component={CoachChatScreen}
          options={{
            headerShown: true,
            title: 'Coach Chat',
          }}
        />
      </Stack.Navigator>
      <DeepLinkHandler />
    </NavigationContainer>
  );
};

export default AppNavigator;
