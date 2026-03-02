import React, {useEffect, useMemo, useState} from 'react';
import CoachChatScreen from '../screens/CoachChatScreen';
import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import {RootStackParamList} from './types';

type RouteEntry<T extends keyof RootStackParamList = keyof RootStackParamList> = {
  name: T;
  params: RootStackParamList[T];
};

const defaultCoachChatParams: RootStackParamList['CoachChat'] = {
  match: {
    id: 'web-preview',
    name: 'Preview Match',
    platform: 'web',
  },
};

const toPath = (routeName: keyof RootStackParamList) => {
  switch (routeName) {
    case 'Home':
      return '/home';
    case 'Onboarding':
      return '/onboarding';
    case 'CoachChat':
      return '/coach-chat';
    default:
      return '/login';
  }
};

const fromPath = (): RouteEntry => {
  if (typeof window === 'undefined') {
    return {name: 'Login', params: undefined};
  }

  const path = window.location.pathname.toLowerCase();

  if (path.startsWith('/home')) {
    return {name: 'Home', params: undefined};
  }

  if (path.startsWith('/onboarding')) {
    return {name: 'Onboarding', params: undefined};
  }

  if (path.startsWith('/coach-chat')) {
    return {name: 'CoachChat', params: defaultCoachChatParams};
  }

  return {name: 'Login', params: undefined};
};

const AppNavigator = () => {
  const [stack, setStack] = useState<RouteEntry[]>([fromPath()]);
  const current = stack[stack.length - 1];

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const targetPath = toPath(current.name);
    if (window.location.pathname !== targetPath) {
      window.history.pushState({name: current.name}, '', targetPath);
    }
  }, [current.name]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const onPopState = () => {
      setStack([fromPath()]);
    };

    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  const navigation = useMemo(
    () => ({
      navigate: <T extends keyof RootStackParamList>(
        name: T,
        params?: RootStackParamList[T],
      ) => {
        const nextParams =
          typeof params === 'undefined'
            ? (undefined as RootStackParamList[T])
            : params;
        setStack(prev => [...prev, {name, params: nextParams}]);
      },
      goBack: () => {
        setStack(prev => (prev.length > 1 ? prev.slice(0, -1) : prev));
      },
    }),
    [],
  );

  if (current.name === 'Home') {
    return (
      <HomeScreen
        navigation={navigation}
        route={{name: 'Home', params: undefined}}
      />
    );
  }

  if (current.name === 'Onboarding') {
    return (
      <OnboardingScreen
        navigation={navigation}
        route={{name: 'Onboarding', params: undefined}}
      />
    );
  }

  if (current.name === 'CoachChat') {
    return (
      <CoachChatScreen
        navigation={navigation}
        route={{
          name: 'CoachChat',
          params: current.params || defaultCoachChatParams,
        }}
      />
    );
  }

  return (
    <LoginScreen
      navigation={navigation}
      route={{name: 'Login', params: undefined}}
    />
  );
};

export default AppNavigator;
