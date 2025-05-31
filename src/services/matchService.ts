import {config} from '../config/config';
import {getAuthToken} from '../config/firebase';
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

// Helper to get auth headers
const getAuthHeaders = async () => {
  try {
    // Try to get Firebase token first
    const token = await getAuthToken();
    return {
      Authorization: `Bearer ${token}`,
    };
  } catch (error) {
    // If Firebase auth fails, use anonymous user ID
    const userId = await getUserId();
    return {
      'X-Anonymous-User': userId,
    };
  }
};

export const loadMatches = async (includeHidden = true): Promise<Match[]> => {
  try {
    const userId = await getUserId();
    logger.app.info('Loading matches for user', {
      userId,
      includeHidden,
      apiBaseUrl: config.apiBaseUrl,
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
      response: error?.response?.data,
      status: error?.response?.status,
    });
    throw error;
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

    logger.match.debug('Deleting match', {matchId});
    await axiosInstance.delete(`/api/users/${userId}/matches/${matchId}`);
    logger.match.debug('Deleted match', {matchId});
    return true;
  } catch (error) {
    logger.match.error('Error deleting match', {
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
