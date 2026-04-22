const mockSetConfigSettings = jest.fn();
const mockSetDefaults = jest.fn();
const mockFetchAndActivate = jest.fn();
const mockGetValue = jest.fn();

jest.mock('@react-native-firebase/remote-config', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    setConfigSettings: mockSetConfigSettings,
    setDefaults: mockSetDefaults,
    fetchAndActivate: mockFetchAndActivate,
    getValue: mockGetValue,
  })),
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    app: {debug: jest.fn(), error: jest.fn()},
  },
}));

import RemoteConfigService from '../remoteConfig';

describe('RemoteConfigService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetConfigSettings.mockResolvedValue(undefined);
    mockSetDefaults.mockResolvedValue(undefined);
    mockFetchAndActivate.mockResolvedValue(false);
    mockGetValue.mockImplementation((key: string) => ({
      asBoolean: () => key === 'global_alert_enabled',
      asString: () => (key === 'global_alert_text' ? 'hello' : ''),
    }));
  });

  it('getInstance returns singleton', () => {
    const a = RemoteConfigService.getInstance();
    const b = RemoteConfigService.getInstance();
    expect(a).toBe(b);
  });

  it('initialize applies settings, defaults, and fetch', async () => {
    mockFetchAndActivate.mockResolvedValue(true);
    const svc = RemoteConfigService.getInstance();
    await svc.initialize();
    expect(mockSetConfigSettings).toHaveBeenCalledWith({
      minimumFetchIntervalMillis: 0,
    });
    expect(mockSetDefaults).toHaveBeenCalledWith({
      global_alert_enabled: false,
      global_alert_text: '',
    });
    expect(mockFetchAndActivate).toHaveBeenCalled();
  });

  it('initialize swallows errors and resets to defaults', async () => {
    mockSetConfigSettings.mockRejectedValueOnce(new Error('rc'));
    const svc = RemoteConfigService.getInstance();
    await expect(svc.initialize()).resolves.toBeUndefined();
    expect(svc.getGlobalAlertEnabled()).toBe(false);
    expect(svc.getGlobalAlertText()).toBe('');
  });

  it('fetchAndActivate returns false on error', async () => {
    mockFetchAndActivate.mockRejectedValue(new Error('net'));
    const svc = RemoteConfigService.getInstance();
    await expect(svc.fetchAndActivate()).resolves.toBe(false);
  });

  it('getGlobalAlertEnabled and getGlobalAlertText reflect updateConfig after activate', async () => {
    mockFetchAndActivate.mockResolvedValue(true);
    mockGetValue.mockImplementation((key: string) => ({
      asBoolean: () => true,
      asString: () => 'Alert copy',
    }));
    const svc = RemoteConfigService.getInstance();
    await svc.fetchAndActivate();
    expect(svc.getGlobalAlertEnabled()).toBe(true);
    expect(svc.getGlobalAlertText()).toBe('Alert copy');
  });
});
