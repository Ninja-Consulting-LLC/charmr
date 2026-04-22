import AsyncStorage from '@react-native-async-storage/async-storage';
import {AxiosError} from 'axios';

const mockGet = jest.fn();
const mockPut = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
}));

jest.mock('../../services/axiosInstance', () => ({
  __esModule: true,
  default: {
    get: (...a: unknown[]) => mockGet(...a),
    put: (...a: unknown[]) => mockPut(...a),
  },
}));

const mockAddMatchService = jest.fn();

jest.mock('../../services/matchService', () => ({
  addMatch: (...a: unknown[]) => mockAddMatchService(...a),
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    match: {debug: jest.fn(), error: jest.fn()},
  },
}));

import {
  addMatch,
  compareMatchesByLastUsedDesc,
  generateMatchId,
  getMatchKey,
  getMatches,
  hideMatch,
  Match,
  restoreMatch,
  updateMatchLastUsed,
} from '../matchUtils';

const base = (): Omit<Match, 'lastUsed' | 'name'> => ({
  id: '1',
  userId: 'u',
  platform: 'hinge',
  hidden: false,
  deleted: false,
  createdAt: '2020-01-01',
  updatedAt: '2020-01-01',
});

describe('compareMatchesByLastUsedDesc', () => {
  it('orders newer lastUsed before older', () => {
    const older: Match = {
      ...base(),
      id: 'a',
      name: 'A',
      lastUsed: '2024-01-01T00:00:00.000Z',
    };
    const newer: Match = {
      ...base(),
      id: 'b',
      name: 'B',
      lastUsed: '2024-06-01T00:00:00.000Z',
    };
    expect(compareMatchesByLastUsedDesc(older, newer)).toBeGreaterThan(0);
    expect(compareMatchesByLastUsedDesc(newer, older)).toBeLessThan(0);
  });

  it('sorts a list with most recent first', () => {
    const m1: Match = {
      ...base(),
      id: '1',
      name: 'First',
      lastUsed: '2024-01-01T00:00:00.000Z',
    };
    const m2: Match = {
      ...base(),
      id: '2',
      name: 'Second',
      lastUsed: '2024-03-01T00:00:00.000Z',
    };
    const m3: Match = {
      ...base(),
      id: '3',
      name: 'Third',
      lastUsed: '2024-02-01T00:00:00.000Z',
    };
    const sorted = [m1, m2, m3].sort(compareMatchesByLastUsedDesc);
    expect(sorted.map(m => m.name)).toEqual(['Second', 'Third', 'First']);
  });
});

describe('getMatchKey / generateMatchId', () => {
  const m: Match = {
    ...base(),
    id: 'x',
    name: 'Sam',
    lastUsed: '2024-01-01',
  };

  it('builds platform::name key', () => {
    expect(getMatchKey(m)).toBe('hinge::Sam');
    expect(generateMatchId(m)).toBe('hinge::Sam');
  });
});

describe('getMatches', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockReset();
  });

  it('returns [] when no userId', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    await expect(getMatches()).resolves.toEqual([]);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('returns API data and passes includeHidden', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('user-9');
    const rows = [{...base(), name: 'A', lastUsed: 't'}];
    mockGet.mockResolvedValue({data: rows});
    await expect(getMatches(true)).resolves.toEqual(rows);
    expect(mockGet).toHaveBeenCalledWith('/api/users/user-9/matches', {
      params: {includeHidden: true},
    });
  });

  it('throws User not found on 404 with expected body', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('u');
    const err = AxiosError.from(
      new Error('nope'),
      undefined,
      undefined,
      undefined,
      {
        data: {error: 'User not found'},
        status: 404,
        statusText: 'Not Found',
        headers: {},
        config: {} as never,
      },
    );
    mockGet.mockRejectedValue(err);
    await expect(getMatches()).rejects.toThrow('User not found');
  });

  it('throws Failed to fetch matches on generic axios error', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('u');
    const err = AxiosError.from(
      new Error('nope'),
      undefined,
      undefined,
      undefined,
      {
        data: {},
        status: 500,
        statusText: 'Err',
        headers: {},
        config: {} as never,
      },
    );
    mockGet.mockRejectedValue(err);
    await expect(getMatches()).rejects.toThrow('Failed to fetch matches');
  });

  it('throws Failed to fetch matches on non-axios error', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('u');
    mockGet.mockRejectedValue(new Error('offline'));
    await expect(getMatches()).rejects.toThrow('Failed to fetch matches');
  });
});

describe('addMatch', () => {
  beforeEach(() => {
    mockAddMatchService.mockReset();
  });

  it('delegates to matchService.addMatch', async () => {
    const m = {...base(), name: 'n', lastUsed: 't'};
    mockAddMatchService.mockResolvedValue(m);
    await expect(addMatch('n', 'hinge')).resolves.toEqual(m);
    expect(mockAddMatchService).toHaveBeenCalledWith('n', 'hinge');
  });
});

describe('hideMatch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockReset();
  });

  it('returns false without userId', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    await expect(hideMatch('a', 'b')).resolves.toBe(false);
    expect(mockPut).not.toHaveBeenCalled();
  });

  it('returns true on success', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('uid');
    mockPut.mockResolvedValue({});
    await expect(hideMatch('Ann', 'tinder')).resolves.toBe(true);
    expect(mockPut).toHaveBeenCalledWith('/api/users/uid/matches/hide', {
      name: 'Ann',
      platform: 'tinder',
    });
  });

  it('returns false on error', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('uid');
    mockPut.mockRejectedValue(new Error('bad'));
    await expect(hideMatch('x', 'y')).resolves.toBe(false);
  });
});

describe('restoreMatch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockReset();
  });

  it('returns false without userId', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    await expect(restoreMatch('a', 'b')).resolves.toBe(false);
  });

  it('returns true on success', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('uid');
    mockPut.mockResolvedValue({});
    await expect(restoreMatch('Bob', 'bumble')).resolves.toBe(true);
    expect(mockPut).toHaveBeenCalledWith('/api/users/uid/matches/restore', {
      matchId: 'bumble::Bob',
    });
  });

  it('returns false on error', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('uid');
    mockPut.mockRejectedValue(new Error('bad'));
    await expect(restoreMatch('x', 'y')).resolves.toBe(false);
  });
});

describe('updateMatchLastUsed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockReset();
  });

  it('returns false without userId', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    await expect(updateMatchLastUsed('hinge::X')).resolves.toBe(false);
  });

  it('returns true on success', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('uid');
    mockPut.mockResolvedValue({});
    await expect(updateMatchLastUsed('p::n')).resolves.toBe(true);
    expect(mockPut).toHaveBeenCalledWith('/api/users/uid/matches/last-used', {
      matchId: 'p::n',
    });
  });

  it('returns false on error', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('uid');
    mockPut.mockRejectedValue(new Error('bad'));
    await expect(updateMatchLastUsed('id')).resolves.toBe(false);
  });
});
