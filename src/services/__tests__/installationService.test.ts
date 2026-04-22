import AsyncStorage from '@react-native-async-storage/async-storage';

const mockGetId = jest.fn();

jest.mock('@react-native-firebase/installations', () => ({
  getInstallations: () => ({
    getId: () => mockGetId(),
  }),
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    app: {debug: jest.fn(), error: jest.fn(), info: jest.fn()},
  },
}));

import {installationService} from '../installationService';

describe('installationService', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockGetId.mockResolvedValue('firebase-install-xyz');
    await installationService.clearInstallationId();
  });

  it('persists installation id from Firebase when storage empty', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    const id = await installationService.getInstallationId();
    expect(id).toBe('firebase-install-xyz');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@charmr/installation_id',
      'firebase-install-xyz',
    );
  });

  it('returns cached value without hitting Firebase again', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    const a = await installationService.getInstallationId();
    const b = await installationService.getInstallationId();
    expect(a).toBe(b);
    expect(mockGetId).toHaveBeenCalledTimes(1);
  });

  it('clearInstallationId drops cache', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    await installationService.getInstallationId();
    await installationService.clearInstallationId();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    mockGetId.mockResolvedValueOnce('second-id');
    const id = await installationService.getInstallationId();
    expect(id).toBe('second-id');
  });
});
