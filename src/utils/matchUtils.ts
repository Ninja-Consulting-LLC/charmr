import AsyncStorage from '@react-native-async-storage/async-storage';
import {isAxiosError} from 'axios';
import axiosInstance from '../services/axiosInstance';
import {addMatch as addMatchService} from '../services/matchService';
import {ID} from '../types';
import {logger} from './logger';

export interface Match {
  id: ID;
  userId: string;
  name: string;
  platform: string;
  lastUsed: string;
  hidden: boolean;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Most recently used first (aligns with API `ORDER BY lastUsed DESC`). */
export const compareMatchesByLastUsedDesc = (a: Match, b: Match): number => {
  const ta = new Date(a.lastUsed).getTime();
  const tb = new Date(b.lastUsed).getTime();
  return tb - ta;
};

export const getMatchKey = (match: Match): string => {
  return `${match.platform}::${match.name}`;
};

export const generateMatchId = (match: Match): string => {
  return getMatchKey(match);
};

export const getMatches = async (includeHidden = false): Promise<Match[]> => {
  try {
    // Get user ID from AsyncStorage to ensure consistency
    const userId = await AsyncStorage.getItem('@charmr/userId');
    if (!userId) {
      logger.match.debug('No user ID found, returning empty matches array');
      return [];
    }

    logger.match.debug('Getting matches', {
      userId,
      includeHidden,
    });

    const response = await axiosInstance.get(`/api/users/${userId}/matches`, {
      params: {includeHidden},
    });

    return response.data;
  } catch (error: unknown) {
    const status = isAxiosError(error) ? error.response?.status : undefined;
    const statusText = isAxiosError(error) ? error.response?.statusText : undefined;
    const apiErr =
      isAxiosError(error) &&
      error.response?.data &&
      typeof error.response.data === 'object' &&
      error.response.data !== null &&
      'error' in error.response.data
        ? String((error.response.data as {error?: unknown}).error)
        : undefined;

    if (status === 404 && apiErr === 'User not found') {
      logger.match.error('User not found when getting matches', {
        status,
        statusText,
      });
      throw new Error('User not found');
    }

    logger.match.error('Failed to fetch matches', {
      status,
      statusText,
    });
    throw new Error('Failed to fetch matches');
  }
};

export const addMatch = async (
  name: string,
  platform: string,
): Promise<Match | null> => {
  return addMatchService(name, platform);
};

export const hideMatch = async (
  name: string,
  platform: string,
): Promise<boolean> => {
  try {
    const userId = await AsyncStorage.getItem('@charmr/userId');
    if (!userId) {
      logger.match.error('No user ID found when hiding match');
      return false;
    }

    logger.match.debug('Hiding match', {name, platform});
    await axiosInstance.put(`/api/users/${userId}/matches/hide`, {
      name,
      platform,
    });
    logger.match.debug('Hidden match', {name, platform});
    return true;
  } catch (error) {
    logger.match.error('Error hiding match', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name,
      platform,
    });
    return false;
  }
};

export const restoreMatch = async (
  name: string,
  platform: string,
): Promise<boolean> => {
  try {
    const userId = await AsyncStorage.getItem('@charmr/userId');
    if (!userId) {
      logger.match.error('No user ID found when restoring match');
      return false;
    }

    const matchId = `${platform}::${name}`;
    logger.match.debug('Restoring match', {matchId});
    await axiosInstance.put(`/api/users/${userId}/matches/restore`, {
      matchId,
    });
    logger.match.debug('Restored match', {matchId});
    return true;
  } catch (error) {
    logger.match.error('Error restoring match', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      matchId: `${platform}::${name}`,
    });
    return false;
  }
};

export const updateMatchLastUsed = async (
  matchId: string,
): Promise<boolean> => {
  try {
    const userId = await AsyncStorage.getItem('@charmr/userId');
    if (!userId) {
      logger.match.error('No user ID found when updating match last used');
      return false;
    }

    logger.match.debug('Updating match last used', {matchId});
    await axiosInstance.put(`/api/users/${userId}/matches/last-used`, {
      matchId,
    });
    logger.match.debug('Updated match last used', {matchId});
    return true;
  } catch (error) {
    logger.match.error('Error updating match last used', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      matchId,
    });
    return false;
  }
};
