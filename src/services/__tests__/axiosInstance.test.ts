import AsyncStorage from '@react-native-async-storage/async-storage';
import {getAuthToken} from '../../config/firebase';

jest.mock('axios', () => {
  const chain = jest.fn().mockResolvedValue({status: 200, data: {ok: true}});
  const inst = Object.assign(chain, {
    interceptors: {
      request: {use: jest.fn()},
      response: {use: jest.fn()},
    },
  });
  return {
    __esModule: true,
    default: {
      create: jest.fn(() => inst),
    },
    AxiosHeaders: jest.fn().mockImplementation(() => {
      const store: Record<string, string> = {};
      return {
        set(key: string, value: string) {
          store[key] = value;
        },
      };
    }),
  };
});

jest.mock('../../config/config', () => ({
  config: {apiBaseUrl: 'https://api.example'},
}));

jest.mock('../../config/firebase', () => ({
  getAuthToken: jest.fn(),
}));

jest.mock('../authService', () => ({
  getUserId: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('../installationService', () => ({
  installationService: {
    getInstallationId: jest.fn(),
  },
}));

jest.mock('@react-native-firebase/installations', () => ({
  getInstallations: jest.fn(() => ({
    getId: jest.fn().mockResolvedValue('firebase-install-id'),
  })),
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    app: {error: jest.fn(), debug: jest.fn(), info: jest.fn()},
  },
}));

import {AxiosHeaders} from 'axios';
import {logger} from '../../utils/logger';
import axiosInstance from '../axiosInstance';

describe('axiosInstance interceptors', () => {
  const axiosMock = axiosInstance as unknown as jest.Mock & {
    interceptors: {
      request: {use: jest.Mock};
      response: {use: jest.Mock};
    };
  };

  const reqUse = axiosMock.interceptors.request.use as jest.Mock;
  const resUse = axiosMock.interceptors.response.use as jest.Mock;
  const requestOnFulfilled = reqUse.mock.calls[0][0] as (
    c: {headers: Record<string, string>},
  ) => Promise<{headers: Record<string, string>}>;
  const requestOnRejected = reqUse.mock.calls[0][1] as (
    e: Error,
  ) => Promise<never>;
  const responseOnOk = resUse.mock.calls[0][0] as <T>(r: T) => T;
  const responseOnRejected = resUse.mock.calls[0][1] as (
    err: unknown,
  ) => Promise<unknown>;

  beforeEach(() => {
    axiosMock.mockClear();
    axiosMock.mockResolvedValue({status: 200, data: {ok: true}});
    (getAuthToken as jest.Mock).mockReset();
    (AsyncStorage.getItem as jest.Mock).mockReset();
    (logger.app.error as jest.Mock).mockClear();
  });

  it('request interceptor sets Bearer when getAuthToken returns token', async () => {
    (getAuthToken as jest.Mock).mockResolvedValue('jwt-here');
    const cfg = {headers: {} as Record<string, string>};
    const out = await requestOnFulfilled(cfg);
    expect(out.headers.Authorization).toBe('Bearer jwt-here');
  });

  it('request interceptor sets X-Anonymous-User from AsyncStorage when no token', async () => {
    (getAuthToken as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('anon-123');
    const cfg = {headers: {} as Record<string, string>};
    const out = await requestOnFulfilled(cfg);
    expect(out.headers['X-Anonymous-User']).toBe('anon-123');
  });

  it('request interceptor returns config when getAuthToken throws', async () => {
    (getAuthToken as jest.Mock).mockRejectedValue(new Error('auth down'));
    const cfg = {headers: {} as Record<string, string>};
    const out = await requestOnFulfilled(cfg);
    expect(out).toBe(cfg);
  });

  it('request error interceptor rethrows', async () => {
    const err = new Error('x');
    await expect(requestOnRejected(err)).rejects.toBe(err);
  });

  it('response success passthrough', () => {
    const res = {data: 1};
    expect(responseOnOk(res)).toBe(res);
  });

  it('response interceptor retries once on 401 with fresh auth headers', async () => {
    (getAuthToken as jest.Mock).mockResolvedValue('new-token');
    const originalRequest = {
      _retry: false,
      headers: {},
      method: 'get',
      url: '/api/x',
    };
    const error = {
      response: {status: 401},
      config: originalRequest,
    };
    await responseOnRejected(error);
    expect(originalRequest._retry).toBe(true);
    expect(axiosMock).toHaveBeenCalled();
  });

  it('response interceptor logs and rejects on non-401', async () => {
    const err = new Error('fail');
    await expect(
      responseOnRejected({
        ...err,
        response: {status: 500, statusText: 'Err', data: {}},
      }),
    ).rejects.toBeTruthy();
    expect(logger.app.error).toHaveBeenCalledWith(
      'API Response Error',
      expect.any(Object),
    );
  });
});

describe('AxiosHeaders mock', () => {
  it('is constructible like axios AxiosHeaders', () => {
    const h = new AxiosHeaders({});
    expect(h.set).toBeDefined();
  });
});
