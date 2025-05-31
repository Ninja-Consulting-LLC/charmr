import AsyncStorage from '@react-native-async-storage/async-storage';
import {config} from '../config/config';
import {ID} from '../types';
import {logger} from '../utils/logger';
import {Match} from '../utils/matchUtils';
import {getUserId} from './authService';
import axiosInstance from './axiosInstance';

// Helper to log request details
const logRequest = (method: string, url: string, body: any = null) => {
  logger.match.debug(`API Request: ${method} ${url}`, {
    method,
    url,
    body,
    apiBaseUrl: config.apiBaseUrl,
  });
};

// Helper to verify user exists
const verifyUser = async (userId: string): Promise<boolean> => {
  try {
    const response = await axiosInstance.get(`/api/users/${userId}`);
    return response.status === 200;
  } catch (error) {
    console.log(
      '[AUTH] User verification failed:',
      error instanceof Error ? error.message : 'Unknown error',
    );
    return false;
  }
};

// Helper to ensure user exists
const ensureUserExists = async (userId: string): Promise<boolean> => {
  try {
    // First try to get the user
    const response = await axiosInstance.get(`/api/users/${userId}`);
    if (response.status === 200) {
      console.log('[AUTH] User exists:', userId);
      return true;
    }
  } catch (error) {
    console.log('[AUTH] User does not exist, creating:', userId);
    try {
      // Create the user
      const createResponse = await axiosInstance.post('/api/users', {
        id: userId,
        name: 'Anonymous User',
        installationId: userId, // Use the same ID as installation ID for anonymous users
      });
      return createResponse.status === 201;
    } catch (createError) {
      console.log(
        '[AUTH] Failed to create user:',
        createError instanceof Error ? createError.message : 'Unknown error',
      );
      return false;
    }
  }
  return false;
};

export const loadMatches = async (includeHidden = true): Promise<Match[]> => {
  try {
    const userId = await AsyncStorage.getItem('@charmr/userId');
    if (!userId) {
      logger.app.error('No user ID found when loading matches');
      return [];
    }

    logger.app.info('Loading matches for user', {
      userId,
      includeHidden,
      apiBaseUrl: axiosInstance.defaults.baseURL,
    });

    const {data} = await axiosInstance.get(`/api/users/${userId}/matches`, {
      params: {includeHidden},
    });

    logger.app.info('Successfully loaded matches', {
      userId,
      matchCount: data?.length || 0,
    });

    return data;
  } catch (error: any) {
    logger.app.error('Error loading matches:', {
      error: error?.message || 'Unknown error',
      stack: error?.stack,
    });
    return [];
  }
};

export const updateMatch = async (match: Match): Promise<Match> => {
  try {
    const userId = await getUserId();
    const {data} = await axiosInstance.put(
      `/api/users/${userId}/matches/${match.id}`,
      match,
    );
    return data;
  } catch (error) {
    logger.app.error('Error updating match:', error);
    throw error;
  }
};

export const removeMatch = async (matchId: string): Promise<void> => {
  try {
    const userId = await getUserId();
    await axiosInstance.delete(`/api/users/${userId}/matches/${matchId}`);
  } catch (error) {
    logger.app.error('Error removing match:', error);
    throw error;
  }
};

export const deleteMatch = async (matchId: string): Promise<boolean> => {
  try {
    const userId = await getUserId();
    if (!userId) {
      logger.match.error('No user ID found when deleting match');
      return false;
    }

    logger.match.debug('Soft deleting match', {matchId});
    // Update the match to set deleted flag instead of actually deleting
    await axiosInstance.put(`/api/users/${userId}/matches/${matchId}`, {
      deleted: true,
      updatedAt: new Date().toISOString(),
    });
    logger.match.debug('Soft deleted match', {matchId});
    return true;
  } catch (error) {
    logger.match.error('Error soft deleting match', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      matchId,
    });
    return false;
  }
};

export const hideMatch = async (matchId: ID): Promise<boolean> => {
  try {
    const userId = await getUserId();
    if (!userId) {
      logger.match.error('No user ID found when hiding match');
      return false;
    }

    logger.match.debug('Hiding match', {matchId});
    await axiosInstance.put(`/api/users/${userId}/matches/hide`, {
      matchId: String(matchId),
    });
    logger.match.debug('Hidden match', {matchId});
    return true;
  } catch (error) {
    logger.match.error('Error hiding match', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      matchId,
    });
    return false;
  }
};

export const restoreMatch = async (matchId: ID): Promise<boolean> => {
  try {
    const userId = await getUserId();
    if (!userId) {
      logger.match.error('No user ID found when restoring match');
      return false;
    }

    logger.match.debug('Restoring match', {matchId});
    await axiosInstance.put(`/api/users/${userId}/matches/restore`, {
      matchId: String(matchId),
    });
    logger.match.debug('Restored match', {matchId});
    return true;
  } catch (error) {
    logger.match.error('Error restoring match', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      matchId,
    });
    return false;
  }
};

export const updateMatchLastUsed = async (
  name: string,
  platform: string,
): Promise<boolean> => {
  try {
    const userId = await getUserId();
    if (!userId) {
      logger.match.error('No user ID found when updating match last used');
      return false;
    }

    logger.match.debug('Updating match last used', {name, platform});
    await axiosInstance.put(`/api/users/${userId}/matches/last-used`, {
      name,
      platform,
    });
    logger.match.debug('Updated match last used', {name, platform});
    return true;
  } catch (error) {
    logger.match.error('Error updating match last used', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name,
      platform,
    });
    return false;
  }
};

export const addMatch = async (
  matchOrName: Match | string,
  platform?: string,
): Promise<Match | null> => {
  try {
    const matchData =
      typeof matchOrName === 'string'
        ? {name: matchOrName, platform}
        : matchOrName;

    const userId = await getUserId();
    if (!userId) {
      console.log('[AUTH] No user ID found when adding match');
      return null;
    }

    // Ensure user exists first
    const userExists = await ensureUserExists(userId);
    if (!userExists) {
      console.log('[AUTH] Failed to ensure user exists:', userId);
      return null;
    }

    console.log('[AUTH] Adding match for user:', userId);
    const response = await axiosInstance.post(
      `/api/users/${userId}/matches`,
      matchData,
    );
    console.log('[AUTH] Successfully added match');
    return response.data;
  } catch (error) {
    console.error('Error adding match:', error);
    return null;
  }
};
