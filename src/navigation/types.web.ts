export type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Onboarding: undefined;
  DevMenu: undefined;
  Admin: undefined;
  Terms: undefined;
  Privacy: undefined;
  CoachChat: {
    match: {
      id: string | number;
      name: string;
      platform: string;
    };
    debugMatchId?: string;
  };
};

type Navigation = {
  navigate: <T extends keyof RootStackParamList>(
    screen: T,
    params?: RootStackParamList[T],
  ) => void;
  goBack: () => void;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> = {
  navigation: Navigation;
  route: {
    name: T;
    params: RootStackParamList[T];
  };
};
