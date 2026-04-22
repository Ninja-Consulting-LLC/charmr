import AsyncStorage from '@react-native-async-storage/async-storage';
import {config} from '../../config/config';
import {getAuthToken} from '../../config/firebase';
import {installationService} from '../installationService';
import {logger} from '../../utils/logger';
import {clearAuthData, getUserId, isAuthenticated} from '../authService';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  multiRemove: jest.fn(),
}));

jest.mock('../../config/firebase', () => ({
  getAuthToken: jest.fn(),
}));

jest.mock('../../config/config', () => ({
  config: {apiBaseUrl: 'https://api.example'},
}));

jest.mock('../installationService', () => ({
  installationService: {
    getInstallationId: jest.fn(),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    app: {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
    },
  },
}));

function jwtWithPayload(payload: Record<string, unknown>): string {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
  return `x.${body}.y`;
}

describe('authService', () => {
  const mockFetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = mockFetch as typeof fetch;
  });

  describe('getUserId', () => {
    it('returns stored user id when present', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('stored-uid');
      await expect(getUserId()).resolves.toBe('stored-uid');
      expect(getAuthToken).not.toHaveBeenCalled();
    });

    it('returns null when no storage and no token', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (getAuthToken as jest.Mock).mockResolvedValue(null);
      await expect(getUserId()).resolves.toBeNull();
    });

    it('returns null for malformed JWT', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (getAuthToken as jest.Mock).mockResolvedValue('not-a-jwt');
      await expect(getUserId()).resolves.toBeNull();
    });

    it('returns null when payload has no user_id', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (getAuthToken as jest.Mock).mockResolvedValue(jwtWithPayload({sub: 'x'}));
      await expect(getUserId()).resolves.toBeNull();
    });

    it('returns userId when backend user exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (getAuthToken as jest.Mock).mockResolvedValue(
        jwtWithPayload({user_id: 'fb-1', email: 'a@b.c', name: 'A'}),
      );
      mockFetch.mockResolvedValue({ok: true});
      await expect(getUserId()).resolves.toBe('fb-1');
      expect(mockFetch).toHaveBeenCalledWith(
        `${config.apiBaseUrl}/api/users/fb-1`,
      );
    });

    it('creates user when GET is not ok then returns userId', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (getAuthToken as jest.Mock).mockResolvedValue(
        jwtWithPayload({user_id: 'fb-2', email: 'a@b.c', name: 'A'}),
      );
      (installationService.getInstallationId as jest.Mock).mockResolvedValue(
        'install-99',
      );
      mockFetch
        .mockResolvedValueOnce({ok: false, status: 404})
        .mockResolvedValueOnce({ok: true});
      await expect(getUserId()).resolves.toBe('fb-2');
      expect(mockFetch).toHaveBeenLastCalledWith(
        `${config.apiBaseUrl}/api/users`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: expect.stringMatching(/^Bearer /),
          }),
        }),
      );
      const postBody = JSON.parse(
        (mockFetch.mock.calls[1][1] as {body: string}).body,
      );
      expect(postBody).toMatchObject({
        id: 'fb-2',
        installationId: 'install-99',
      });
    });

    it('returns null when user creation fails', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (getAuthToken as jest.Mock).mockResolvedValue(
        jwtWithPayload({user_id: 'fb-3', email: 'a@b.c'}),
      );
      (installationService.getInstallationId as jest.Mock).mockResolvedValue(
        'i',
      );
      mockFetch
        .mockResolvedValueOnce({ok: false})
        .mockResolvedValueOnce({ok: false, status: 500});
      await expect(getUserId()).resolves.toBeNull();
    });

    it('returns null when fetch throws during user check', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (getAuthToken as jest.Mock).mockResolvedValue(
        jwtWithPayload({user_id: 'fb-4', email: 'a@b.c'}),
      );
      mockFetch.mockRejectedValue(new Error('network'));
      await expect(getUserId()).resolves.toBeNull();
    });

    it('returns null on unexpected outer error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('storage'));
      await expect(getUserId()).resolves.toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('returns true when getAuthToken resolves', async () => {
      (getAuthToken as jest.Mock).mockResolvedValue('t');
      await expect(isAuthenticated()).resolves.toBe(true);
    });

    it('returns false when getAuthToken throws', async () => {
      (getAuthToken as jest.Mock).mockRejectedValue(new Error('no'));
      await expect(isAuthenticated()).resolves.toBe(false);
    });
  });

  describe('clearAuthData', () => {
    it('multiRemoves keys and ignores errors', async () => {
      (AsyncStorage.multiRemove as jest.Mock).mockResolvedValue(undefined);
      await clearAuthData();
      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(
        expect.arrayContaining(['@charmr/userId', '@charmr/auth_token']),
      );
    });

    it('logs when multiRemove fails', async () => {
      (AsyncStorage.multiRemove as jest.Mock).mockRejectedValue(new Error('e'));
      await clearAuthData();
      expect(logger.app.error).toHaveBeenCalled();
    });
  });
});
