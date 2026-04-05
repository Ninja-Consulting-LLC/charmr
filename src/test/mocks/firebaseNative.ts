/**
 * Top-level Jest mocks for native Firebase, auth, and billing modules.
 * Imported from setup.ts for hoisting to apply before other imports.
 */

jest.mock('@react-native-firebase/app', () => ({
  __esModule: true,
  default: {
    apps: [],
    app: jest.fn(() => ({})),
  },
}));

jest.mock('@react-native-firebase/installations', () => ({
  __esModule: true,
  getInstallations: jest.fn(() => ({
    getId: jest.fn(() => Promise.resolve('jest-installation-id')),
  })),
}));

jest.mock('@react-native-firebase/auth', () => {
  const authInstance = {
    currentUser: null,
    signOut: jest.fn(),
    fetchSignInMethodsForEmail: jest.fn(() => Promise.resolve([])),
  };
  return {
    __esModule: true,
    getAuth: jest.fn(() => authInstance),
    FacebookAuthProvider: {credential: jest.fn(() => ({}))},
    GoogleAuthProvider: {credential: jest.fn(() => ({}))},
    AppleAuthProvider: {credential: jest.fn(() => ({}))},
    signInWithCredential: jest.fn(),
  };
});

jest.mock('@react-native-google-signin/google-signin', () => ({
  __esModule: true,
  GoogleSignin: {
    hasPlayServices: jest.fn(() => Promise.resolve(true)),
    signIn: jest.fn(),
    signOut: jest.fn(),
  },
  statusCodes: {
    SIGN_IN_CANCELLED: '1',
    IN_PROGRESS: '2',
    PLAY_SERVICES_NOT_AVAILABLE: '3',
  },
}));

jest.mock('react-native-fbsdk-next', () => ({
  __esModule: true,
  LoginManager: {logInWithPermissions: jest.fn()},
  AccessToken: {getCurrentAccessToken: jest.fn()},
  AuthenticationToken: {getAuthenticationTokenIOS: jest.fn()},
}));

jest.mock('react-native-sha256', () => ({
  __esModule: true,
  sha256: jest.fn((s: string) => Promise.resolve(`mock-${s}`)),
}));

jest.mock('@invertase/react-native-apple-authentication', () => ({
  __esModule: true,
  appleAuth: {
    Operation: {LOGIN: 1},
    Scope: {EMAIL: 0, FULL_NAME: 1},
    performRequest: jest.fn(),
  },
}));

jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    configure: jest.fn(() => Promise.resolve()),
    getCustomerInfo: jest.fn(() => Promise.resolve({})),
    getOfferings: jest.fn(() =>
      Promise.resolve({current: null, all: {}}),
    ),
    logIn: jest.fn(),
    logOut: jest.fn(),
    addCustomerInfoUpdateListener: jest.fn(() => () => {}),
  },
  PURCHASES_ERROR_CODE: {},
}));

jest.mock('react-native-purchases-ui', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('react-native-config', () => ({
  __esModule: true,
  default: {
    REVENUECAT_IOS_API_KEY: 'test-ios',
    REVENUECAT_ANDROID_API_KEY: 'test-android',
  },
}));
