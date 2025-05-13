import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Match} from '../utils/matchUtils';

export type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Onboarding: undefined;
  DevMenu: undefined;
  Admin: undefined;
  CoachChat: {
    match: Match;
  };
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;
