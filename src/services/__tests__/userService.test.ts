import {AxiosError} from 'axios';
import {SubscriptionTier} from '../../types/enums';
import {installationService} from '../installationService';

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPut = jest.fn();
const mockDelete = jest.fn();

jest.mock('../../utils/logger', () => ({
  logger: {
    app: {debug: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn()},
    match: {debug: jest.fn(), error: jest.fn()},
    config: {debug: jest.fn(), info: jest.fn()},
  },
}));

jest.mock('../axiosInstance', () => ({
  __esModule: true,
  default: {
    get: (...a: unknown[]) => mockGet(...a),
    post: (...a: unknown[]) => mockPost(...a),
    put: (...a: unknown[]) => mockPut(...a),
    delete: (...a: unknown[]) => mockDelete(...a),
  },
}));

jest.mock('../installationService', () => ({
  installationService: {
    getInstallationId: jest.fn(() => Promise.resolve('inst-1')),
    clearInstallationId: jest.fn(),
  },
}));

import * as userService from '../userService';

const userPayload = {
  id: 'u1',
  email: 'a@b.com',
  name: 'A',
  plan: SubscriptionTier.FREE,
  dailyMessagesUsed: 0,
  extraMessages: 0,
  lastResetDate: '2020-01-01',
};

describe('userService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(installationService.getInstallationId)
      .mockResolvedValue('inst-1');
  });

  it('fetchUserData attaches getDailyMessageLimit', async () => {
    mockGet.mockResolvedValueOnce({data: userPayload});
    const u = await userService.fetchUserData('u1');
    expect(u?.id).toBe('u1');
    expect(u?.getDailyMessageLimit()).toBe(5);
  });

  it('fetchUserData returns null on error', async () => {
    mockGet.mockRejectedValueOnce(new Error('x'));
    await expect(userService.fetchUserData('u1')).resolves.toBeNull();
  });

  it('updateUserPlan returns user with limit accessor', async () => {
    mockPut.mockResolvedValueOnce({data: {...userPayload, plan: SubscriptionTier.PRO}});
    const u = await userService.updateUserPlan('u1', SubscriptionTier.PRO);
    expect(u.getDailyMessageLimit()).toBe(Infinity);
  });

  it('createUser posts and decorates response', async () => {
    mockPost.mockResolvedValueOnce({data: userPayload});
    const u = await userService.createUser({
      id: 'u1',
      email: 'a@b.com',
      name: 'A',
    });
    expect(u.getDailyMessageLimit()).toBe(5);
  });

  it('findUserByInstallationId returns null on 404', async () => {
    const err = new AxiosError('nf', '404', undefined, undefined, {
      status: 404,
      data: {},
      statusText: 'Not Found',
      headers: {},
      config: {} as never,
    });
    mockGet.mockRejectedValueOnce(err);
    await expect(
      userService.findUserByInstallationId('inst'),
    ).resolves.toBeNull();
  });

  it('findUserByInstallationId rethrows non-404 axios errors', async () => {
    const err = new AxiosError('srv', '500', undefined, undefined, {
      status: 500,
      data: {},
      statusText: 'Err',
      headers: {},
      config: {} as never,
    });
    mockGet.mockRejectedValueOnce(err);
    await expect(
      userService.findUserByInstallationId('inst'),
    ).rejects.toEqual(err);
  });

  it('createAnonymousUser returns existing user when found', async () => {
    mockGet.mockResolvedValueOnce({data: userPayload});
    const u = await userService.createAnonymousUser();
    expect(u.id).toBe('u1');
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('createAnonymousUser creates when no existing', async () => {
    const nf = new AxiosError('nf', '404', undefined, undefined, {
      status: 404,
      data: {},
      statusText: 'Not Found',
      headers: {},
      config: {} as never,
    });
    mockGet.mockRejectedValueOnce(nf);
    mockPost.mockResolvedValueOnce({data: userPayload});
    const u = await userService.createAnonymousUser();
    expect(u.id).toBe('u1');
    expect(mockPost).toHaveBeenCalledWith(
      '/api/users',
      expect.objectContaining({installationId: 'inst-1'}),
    );
  });

  it('linkUsers posts link payload', async () => {
    mockPost.mockResolvedValueOnce({data: {}});
    await userService.linkUsers('a', 'b');
    expect(mockPost).toHaveBeenCalledWith('/api/users/link', {
      anonymousUserId: 'a',
      registeredUserId: 'b',
      installationId: 'inst-1',
    });
  });

  it('linkAnonymousUser posts without extra logging fields', async () => {
    mockPost.mockResolvedValueOnce({data: {}});
    await userService.linkAnonymousUser('a', 'b');
    expect(mockPost).toHaveBeenCalled();
  });

  it('findUserByEmail returns user', async () => {
    mockGet.mockResolvedValueOnce({data: userPayload});
    const u = await userService.findUserByEmail('a@b.com');
    expect(u?.email).toBe('a@b.com');
  });

  it('getUserProfile returns raw data', async () => {
    mockGet.mockResolvedValueOnce({data: {x: 1}});
    await expect(userService.getUserProfile('u')).resolves.toEqual({x: 1});
  });

  it('updateUserProfile uses device-token endpoint for token-only update', async () => {
    mockPut.mockResolvedValueOnce({data: {ok: true}});
    const out = await userService.updateUserProfile('u', {
      deviceToken: 'tok',
    });
    expect(out).toEqual({ok: true});
    expect(mockPut).toHaveBeenCalledWith('/api/users/u/device-token', {
      deviceToken: 'tok',
    });
  });

  it('deleteUserAccount deletes', async () => {
    mockDelete.mockResolvedValueOnce({data: {deleted: true}});
    await expect(userService.deleteUserAccount('u')).resolves.toEqual({
      deleted: true,
    });
  });

  it('getUserSettings gets', async () => {
    mockGet.mockResolvedValueOnce({data: {theme: 'dark'}});
    await expect(userService.getUserSettings('u')).resolves.toEqual({
      theme: 'dark',
    });
  });

  it('updateUserSettings puts', async () => {
    mockPut.mockResolvedValueOnce({data: {saved: 1}});
    await expect(
      userService.updateUserSettings('u', {a: 1}),
    ).resolves.toEqual({saved: 1});
  });
});
