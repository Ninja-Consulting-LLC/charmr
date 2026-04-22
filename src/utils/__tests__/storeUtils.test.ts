import AsyncStorage from '@react-native-async-storage/async-storage';
import {SubscriptionTier} from '../../types/enums';
import {
  BACKEND_VERSION_KEY,
  checkBackendVersion,
  cleanupStaleData,
  createDefaultUser,
  CURRENT_BACKEND_VERSION,
  shouldResetDailyCount,
} from '../storeUtils';

describe('storeUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('cleanupStaleData removes known keys', async () => {
    await cleanupStaleData();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@charmr/userId');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@charmr/user');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
      '@charmr/isAuthenticated',
    );
  });

  it('checkBackendVersion migrates when version mismatches', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('0.0.1');
    await checkBackendVersion();
    expect(AsyncStorage.removeItem).toHaveBeenCalled();
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      BACKEND_VERSION_KEY,
      CURRENT_BACKEND_VERSION,
    );
  });

  it('checkBackendVersion skips when version matches', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      CURRENT_BACKEND_VERSION,
    );
    await checkBackendVersion();
    expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
  });

  it('createDefaultUser uses FREE plan and limit accessor', () => {
    const u = createDefaultUser();
    expect(u.plan).toBe(SubscriptionTier.FREE);
    expect(u.getDailyMessageLimit()).toBe(5);
  });

  it('shouldResetDailyCount compares calendar days', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(shouldResetDailyCount(yesterday.toISOString())).toBe(true);
    expect(shouldResetDailyCount(new Date().toISOString())).toBe(false);
  });
});
