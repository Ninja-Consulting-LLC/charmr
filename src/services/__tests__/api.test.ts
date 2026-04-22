import {AxiosError} from 'axios';
import NetInfo from '@react-native-community/netinfo';
import {MessageMode} from '../../types/enums';
import type {GenerateReplyRequest} from '../../types/message';

const mockPost = jest.fn();
const mockGet = jest.fn();
const mockPut = jest.fn();

jest.mock('../../utils/logger', () => ({
  logger: {
    app: {debug: jest.fn(), error: jest.fn(), info: jest.fn()},
    match: {debug: jest.fn(), error: jest.fn()},
    config: {debug: jest.fn(), info: jest.fn()},
  },
}));

jest.mock('../axiosInstance', () => ({
  __esModule: true,
  default: {
    post: (...args: unknown[]) => mockPost(...args),
    get: (...args: unknown[]) => mockGet(...args),
    put: (...args: unknown[]) => mockPut(...args),
    delete: jest.fn(),
  },
}));

const mockGetAuthToken = jest.fn();
jest.mock('../../config/firebase', () => ({
  getAuthToken: () => mockGetAuthToken(),
}));

import * as api from '../api';

const baseGenerateRequest: GenerateReplyRequest = {
  prompt: 'hello',
  images: [],
  userId: 'u1',
  matchId: 'm1',
};

describe('api service', () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockGet.mockReset();
    mockPut.mockReset();
    mockGetAuthToken.mockReset();
    mockGetAuthToken.mockResolvedValue(null);
  });

  describe('generateReply', () => {
    it('returns response data on success', async () => {
      mockPost.mockResolvedValue({
        data: {reply: 'ok', mode: MessageMode.GENERATE},
      });
      const res = await api.generateReply(baseGenerateRequest);
      expect(res.reply).toBe('ok');
      expect(mockPost).toHaveBeenCalledWith(
        '/api/generate-reply',
        baseGenerateRequest,
      );
    });

    it('maps API error body when present', async () => {
      const err = new AxiosError('bad', '400', undefined, undefined, {
        status: 429,
        data: {
          error: 'Message limit reached',
          type: 'MESSAGE_LIMIT',
          limits: {dailyMessagesUsed: 5, extraMessages: 0},
        },
        statusText: 'Too Many Requests',
        headers: {},
        config: {} as never,
      });
      mockPost.mockRejectedValue(err);
      const res = await api.generateReply(baseGenerateRequest);
      expect(res.error).toBe('Message limit reached');
      expect(res.type).toBe('MESSAGE_LIMIT');
      expect(res.limits).toEqual({
        dailyMessagesUsed: 5,
        extraMessages: 0,
      });
    });

    it('returns TIMEOUT_ERROR for ECONNABORTED', async () => {
      const err = new AxiosError('timeout', 'ECONNABORTED');
      mockPost.mockRejectedValue(err);
      const res = await api.generateReply(baseGenerateRequest);
      expect(res.type).toBe('TIMEOUT_ERROR');
      expect(res.error).toMatch(/timed out/i);
    });

    it('returns NETWORK_ERROR when axios has no response', async () => {
      const err = new AxiosError('net', 'ERR_NETWORK');
      mockPost.mockRejectedValue(err);
      const res = await api.generateReply(baseGenerateRequest);
      expect(res.type).toBe('NETWORK_ERROR');
    });

    it('returns UNKNOWN_ERROR for non-axios failures', async () => {
      mockPost.mockRejectedValue(new Error('weird'));
      const res = await api.generateReply(baseGenerateRequest);
      expect(res.type).toBe('UNKNOWN_ERROR');
    });
  });

  describe('submitSupportRequest', () => {
    it('sends X-Auth-Bypass when authBypass is true', async () => {
      mockPost.mockResolvedValue({data: {ok: true}});
      await api.submitSupportRequest(
        {
          userId: 'u',
          email: 'e@e.com',
          message: 'hi',
          plan: 'free',
          dailyMessagesUsed: 0,
          dailyMessageLimit: 5,
          extraMessages: 0,
        },
        true,
      );
      expect(mockPost).toHaveBeenCalledWith(
        '/api/support',
        expect.any(Object),
        expect.objectContaining({
          headers: expect.objectContaining({'X-Auth-Bypass': 'true'}),
          timeout: 20000,
        }),
      );
    });

    it('adds Bearer token when token exists', async () => {
      mockGetAuthToken.mockResolvedValue('id-token');
      mockPost.mockResolvedValue({data: {}});
      await api.submitSupportRequest(
        {
          userId: 'u',
          email: 'e@e.com',
          message: 'hi',
          plan: 'free',
          dailyMessagesUsed: 0,
          dailyMessageLimit: 5,
          extraMessages: 0,
        },
        false,
      );
      expect(mockPost).toHaveBeenCalledWith(
        '/api/support',
        expect.any(Object),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer id-token',
          }),
        }),
      );
    });
  });

  describe('fetchUserData', () => {
    it('returns user payload on success', async () => {
      mockGet.mockResolvedValue({data: {id: 'u1', email: 'a@b.com'}});
      const user = await api.fetchUserData('u1');
      expect(user).toEqual({id: 'u1', email: 'a@b.com'});
    });

    it('returns null on failure', async () => {
      mockGet.mockRejectedValue(new Error('fail'));
      const user = await api.fetchUserData('u1');
      expect(user).toBeNull();
    });
  });

  describe('getNetworkInfo', () => {
    it('returns NetInfo shape on success', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValueOnce({
        type: 'wifi',
        isConnected: true,
        isInternetReachable: true,
        details: {},
      });
      const info = await api.getNetworkInfo();
      expect(info).toMatchObject({
        isConnected: true,
        type: 'wifi',
      });
    });

    it('returns error field when NetInfo throws', async () => {
      (NetInfo.fetch as jest.Mock).mockRejectedValueOnce(new Error('ni'));
      const info = await api.getNetworkInfo();
      expect(info).toEqual({error: 'ni'});
    });
  });

  describe('admin/dev helpers', () => {
    it('resetDb posts with auth header', async () => {
      mockGetAuthToken.mockResolvedValue('tok');
      mockPost.mockResolvedValue({data: {done: true}});
      const data = await api.resetDb();
      expect(data).toEqual({done: true});
      expect(mockPost).toHaveBeenCalledWith(
        '/api/admin/reset-db',
        {},
        expect.objectContaining({
          headers: expect.objectContaining({Authorization: 'Bearer tok'}),
        }),
      );
    });

    it('testContext propagates rejection', async () => {
      mockGetAuthToken.mockResolvedValue('tok');
      mockPost.mockRejectedValue(new Error('nope'));
      await expect(api.testContext()).rejects.toThrow('nope');
    });

    it('getConfig returns data', async () => {
      mockGet.mockResolvedValue({data: {feature: true}});
      await expect(api.getConfig()).resolves.toEqual({feature: true});
    });

    it('updateConfig puts JSON body', async () => {
      mockPut.mockResolvedValue({data: {saved: 1}});
      await api.updateConfig({a: 1});
      expect(mockPut).toHaveBeenCalledWith('/api/config', {a: 1});
    });
  });
});
