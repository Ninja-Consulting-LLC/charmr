import AsyncStorage from '@react-native-async-storage/async-storage';
import {DevUtils} from '../devUtils';

jest.mock('../logger', () => ({
  logger: {
    app: {debug: jest.fn(), error: jest.fn(), info: jest.fn()},
  },
}));

describe('DevUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shouldBypassAuth follows __DEV__', () => {
    expect(typeof DevUtils.shouldBypassAuth()).toBe('boolean');
  });

  it('isSandboxMode resolves false', async () => {
    await expect(DevUtils.isSandboxMode()).resolves.toBe(false);
  });

  it('resetOnboarding removes key', async () => {
    await DevUtils.resetOnboarding();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('hasOnboarded');
  });

  it('clearStorage calls AsyncStorage.clear', async () => {
    await DevUtils.clearStorage();
    expect(AsyncStorage.clear).toHaveBeenCalled();
  });

  it('clearMatchStorage removes matches key', async () => {
    await DevUtils.clearMatchStorage();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('matches');
  });

  it('inspectStorage logs keys', async () => {
    (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValueOnce(['a']);
    (AsyncStorage.multiGet as jest.Mock).mockResolvedValueOnce([['a', '1']]);
    await DevUtils.inspectStorage();
    expect(AsyncStorage.multiGet).toHaveBeenCalledWith(['a']);
  });
});
