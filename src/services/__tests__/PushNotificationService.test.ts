import {Platform} from 'react-native';

const mockRequestPermission = jest.fn();
const mockGetToken = jest.fn();
const mockOnTokenRefresh = jest.fn();
const mockOnMessage = jest.fn();
const mockOnNotificationOpenedApp = jest.fn();
const mockGetInitialNotification = jest.fn();

jest.mock('@react-native-firebase/messaging', () => {
  const AuthorizationStatus = {
    AUTHORIZED: 1,
    PROVISIONAL: 2,
    DENIED: 0,
  };
  const defaultExport = jest.fn(() => ({
    requestPermission: mockRequestPermission,
    getToken: mockGetToken,
    onTokenRefresh: mockOnTokenRefresh,
    onMessage: mockOnMessage,
    onNotificationOpenedApp: mockOnNotificationOpenedApp,
    getInitialNotification: mockGetInitialNotification,
  }));
  Object.assign(defaultExport, {AuthorizationStatus});
  return {
    __esModule: true,
    default: defaultExport,
    AuthorizationStatus,
  };
});

jest.mock('../../utils/logger', () => ({
  logger: {
    app: {debug: jest.fn(), error: jest.fn(), info: jest.fn()},
  },
}));

function loadPushService() {
  jest.resetModules();
  return require('../PushNotificationService').pushNotificationService as {
    requestPermission: () => Promise<boolean>;
    getToken: (n?: number) => Promise<string | null>;
    onTokenRefresh: (cb: (t: string) => void) => Promise<void>;
    onMessage: (cb: (m: unknown) => void) => Promise<void>;
    onNotificationOpenedApp: (cb: (m: unknown) => void) => Promise<void>;
    getInitialNotification: () => Promise<unknown>;
  };
}

describe('PushNotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetInitialNotification.mockResolvedValue(null);
  });

  it('requestPermission returns true on Android without calling messaging permission', async () => {
    const svc = loadPushService();
    const prev = Platform.OS;
    Object.assign(Platform, {OS: 'android'});
    try {
      await expect(svc.requestPermission()).resolves.toBe(true);
      expect(mockRequestPermission).not.toHaveBeenCalled();
    } finally {
      Object.assign(Platform, {OS: prev});
    }
  });

  it('requestPermission returns true when iOS authorized', async () => {
    const messaging = require('@react-native-firebase/messaging');
    mockRequestPermission.mockResolvedValue(
      messaging.AuthorizationStatus.AUTHORIZED,
    );
    const svc = loadPushService();
    const prev = Platform.OS;
    Object.assign(Platform, {OS: 'ios'});
    try {
      await expect(svc.requestPermission()).resolves.toBe(true);
    } finally {
      Object.assign(Platform, {OS: prev});
    }
  });

  it('requestPermission returns false on iOS error', async () => {
    mockRequestPermission.mockRejectedValue(new Error('perm'));
    const svc = loadPushService();
    const prev = Platform.OS;
    Object.assign(Platform, {OS: 'ios'});
    try {
      await expect(svc.requestPermission()).resolves.toBe(false);
    } finally {
      Object.assign(Platform, {OS: prev});
    }
  });

  it('getToken returns value and uses cache on second call', async () => {
    const svc = loadPushService();
    mockGetToken.mockResolvedValue('fcm-token');
    await expect(svc.getToken()).resolves.toBe('fcm-token');
    await expect(svc.getToken()).resolves.toBe('fcm-token');
    expect(mockGetToken).toHaveBeenCalledTimes(1);
  });

  it('getToken returns null after max retries', async () => {
    jest.useFakeTimers();
    const svc = loadPushService();
    mockGetToken.mockRejectedValue(new Error('no token'));
    const p = svc.getToken(0);
    for (let i = 0; i < 3; i += 1) {
      await jest.runAllTimersAsync();
    }
    await expect(p).resolves.toBeNull();
    jest.useRealTimers();
  });

  it('getInitialNotification returns null when none', async () => {
    mockGetInitialNotification.mockResolvedValue(null);
    const svc = loadPushService();
    await expect(svc.getInitialNotification()).resolves.toBeNull();
  });

  it('getInitialNotification returns message when present', async () => {
    const msg = {data: {k: 'v'}};
    mockGetInitialNotification.mockResolvedValue(msg);
    const svc = loadPushService();
    await expect(svc.getInitialNotification()).resolves.toEqual(msg);
  });

  it('onTokenRefresh registers listener', async () => {
    const svc = loadPushService();
    await svc.onTokenRefresh(() => {});
    expect(mockOnTokenRefresh).toHaveBeenCalled();
  });

  it('onMessage registers listener', async () => {
    const svc = loadPushService();
    await svc.onMessage(() => {});
    expect(mockOnMessage).toHaveBeenCalled();
  });

  it('onNotificationOpenedApp registers listener', async () => {
    const svc = loadPushService();
    await svc.onNotificationOpenedApp(() => {});
    expect(mockOnNotificationOpenedApp).toHaveBeenCalled();
  });
});
