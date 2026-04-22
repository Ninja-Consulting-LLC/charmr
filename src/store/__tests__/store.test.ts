import AsyncStorage from '@react-native-async-storage/async-storage';
import {fetchUserData} from '../../services/api';
import {SubscriptionTier} from '../../types/enums';
import {
  BACKEND_VERSION_KEY,
  checkBackendVersion,
  cleanupStaleData,
  CURRENT_BACKEND_VERSION,
  defaultStore,
  syncUserWithBackend,
} from '../store';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('../../services/api', () => ({
  fetchUserData: jest.fn(),
}));

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;
const mockRemoveItem = AsyncStorage.removeItem as jest.Mock;
const mockFetchUserData = fetchUserData as jest.Mock;

describe('store module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('defaultStore exposes noop handlers and default user', () => {
    expect(defaultStore.userId).toBe('');
    expect(defaultStore.matches).toEqual([]);
    expect(defaultStore.isLoading).toBe(true);
    expect(() => defaultStore.setUser({plan: SubscriptionTier.FREE})).not.toThrow();
  });

  describe('cleanupStaleData', () => {
    it('removes persisted keys', async () => {
      await cleanupStaleData();
      expect(mockRemoveItem).toHaveBeenCalledWith('@charmr/userId');
      expect(mockRemoveItem).toHaveBeenCalledWith('@charmr/user');
      expect(mockRemoveItem).toHaveBeenCalledWith('@charmr/isAuthenticated');
    });

    it('swallows AsyncStorage errors', async () => {
      mockRemoveItem.mockRejectedValueOnce(new Error('disk'));
      const err = jest.spyOn(console, 'error').mockImplementation(() => {});
      await expect(cleanupStaleData()).resolves.toBeUndefined();
      expect(err).toHaveBeenCalled();
      err.mockRestore();
    });
  });

  describe('checkBackendVersion', () => {
    it('does nothing when version matches', async () => {
      mockGetItem.mockResolvedValue(CURRENT_BACKEND_VERSION);
      await checkBackendVersion();
      expect(mockRemoveItem).not.toHaveBeenCalled();
      expect(mockSetItem).not.toHaveBeenCalled();
    });

    it('clears storage and writes version when mismatched', async () => {
      mockGetItem.mockResolvedValue('0.9.0');
      await checkBackendVersion();
      expect(mockRemoveItem).toHaveBeenCalled();
      expect(mockSetItem).toHaveBeenCalledWith(
        BACKEND_VERSION_KEY,
        CURRENT_BACKEND_VERSION,
      );
    });

    it('swallows errors', async () => {
      mockGetItem.mockRejectedValueOnce(new Error('read'));
      const err = jest.spyOn(console, 'error').mockImplementation(() => {});
      await expect(checkBackendVersion()).resolves.toBeUndefined();
      expect(err).toHaveBeenCalled();
      err.mockRestore();
    });
  });

  describe('syncUserWithBackend', () => {
    it('returns null when fetch returns null', async () => {
      mockFetchUserData.mockResolvedValue(null);
      await expect(syncUserWithBackend('u1')).resolves.toBeNull();
    });

    it('merges getDailyMessageLimit from plan', async () => {
      mockFetchUserData.mockResolvedValue({
        id: 'u1',
        plan: SubscriptionTier.FREE,
        dailyMessagesUsed: 0,
        extraMessages: 0,
        lastResetDate: 'd',
        createdAt: 'c',
      });
      const u = await syncUserWithBackend('u1');
      expect(u?.getDailyMessageLimit()).toBe(5);
    });

    it('returns null on fetch error', async () => {
      mockFetchUserData.mockRejectedValue(new Error('network'));
      const err = jest.spyOn(console, 'error').mockImplementation(() => {});
      await expect(syncUserWithBackend('u1')).resolves.toBeNull();
      expect(err).toHaveBeenCalled();
      err.mockRestore();
    });
  });
});
