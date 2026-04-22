import AsyncStorage from '@react-native-async-storage/async-storage';

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPut = jest.fn();
const mockDelete = jest.fn();

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
    get: (...a: unknown[]) => mockGet(...a),
    post: (...a: unknown[]) => mockPost(...a),
    put: (...a: unknown[]) => mockPut(...a),
    delete: (...a: unknown[]) => mockDelete(...a),
  },
}));

jest.mock('../authService', () => ({
  getUserId: jest.fn(() => Promise.resolve('uid-1')),
}));

import * as matchService from '../matchService';
import {getUserId} from '../authService';

describe('matchService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockReset();
    (getUserId as jest.Mock).mockResolvedValue('uid-1');
  });

  it('loadMatches returns [] when no userId in storage', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    const rows = await matchService.loadMatches(true);
    expect(rows).toEqual([]);
  });

  it('loadMatches returns API data', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('stored-user');
    mockGet.mockResolvedValue({data: [{id: '1', name: 'A'}]});
    const rows = await matchService.loadMatches(false);
    expect(mockGet).toHaveBeenCalledWith('/api/users/stored-user/matches', {
      params: {includeHidden: false},
    });
    expect(rows).toEqual([{id: '1', name: 'A'}]);
  });

  it('loadMatches returns [] on error', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('u');
    mockGet.mockRejectedValue(new Error('net'));
    await expect(matchService.loadMatches()).resolves.toEqual([]);
  });

  it('updateMatch puts and returns data', async () => {
    const match = {
      id: '9',
      userId: 'uid-1',
      name: 'x',
      platform: 't',
      lastUsed: '',
      hidden: false,
      deleted: false,
      createdAt: '',
      updatedAt: '',
    };
    mockPut.mockResolvedValue({data: match});
    const out = await matchService.updateMatch(match);
    expect(out).toEqual(match);
    expect(mockPut).toHaveBeenCalledWith(
      '/api/users/uid-1/matches/9',
      match,
    );
  });

  it('removeMatch deletes', async () => {
    mockDelete.mockResolvedValue({status: 204});
    await matchService.removeMatch('9');
    expect(mockDelete).toHaveBeenCalledWith('/api/users/uid-1/matches/9');
  });

  it('deleteMatch returns false without userId', async () => {
    jest.mocked(getUserId).mockResolvedValueOnce(null);
    await expect(matchService.deleteMatch('1')).resolves.toBe(false);
  });

  it('deleteMatch returns true on success', async () => {
    mockDelete.mockResolvedValue({});
    await expect(matchService.deleteMatch('1')).resolves.toBe(true);
  });

  it('hideMatch returns false without userId', async () => {
    jest.mocked(getUserId).mockResolvedValueOnce(null);
    await expect(matchService.hideMatch('1')).resolves.toBe(false);
  });

  it('hideMatch puts hide payload', async () => {
    mockPut.mockResolvedValue({});
    await expect(matchService.hideMatch(2)).resolves.toBe(true);
    expect(mockPut).toHaveBeenCalledWith('/api/users/uid-1/matches/hide', {
      matchId: '2',
    });
  });

  it('restoreMatch puts restore payload', async () => {
    mockPut.mockResolvedValue({});
    await expect(matchService.restoreMatch(3)).resolves.toBe(true);
    expect(mockPut).toHaveBeenCalledWith('/api/users/uid-1/matches/restore', {
      matchId: '3',
    });
  });

  it('updateMatchLastUsed puts body', async () => {
    mockPut.mockResolvedValue({});
    await expect(matchService.updateMatchLastUsed('m')).resolves.toBe(true);
    expect(mockPut).toHaveBeenCalledWith(
      '/api/users/uid-1/matches/last-used',
      {matchId: 'm'},
    );
  });

  it('addMatch returns null when getUserId empty', async () => {
    jest.mocked(getUserId).mockResolvedValueOnce(null);
    await expect(matchService.addMatch('n', 'p')).resolves.toBeNull();
  });

  it('addMatch creates user then posts match', async () => {
    mockGet.mockResolvedValueOnce({status: 200});
    mockPost.mockResolvedValueOnce({data: {id: 'new'}});
    const m = await matchService.addMatch('Sam', 'hinge');
    expect(m).toEqual({id: 'new'});
    expect(mockPost).toHaveBeenCalledWith('/api/users/uid-1/matches', {
      name: 'Sam',
      platform: 'hinge',
    });
  });
});
