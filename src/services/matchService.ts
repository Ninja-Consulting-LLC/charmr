import installations from '@react-native-firebase/installations';
import {config} from '../config/config';
import {getAuthToken} from '../config/firebase';
import {logger} from '../utils/logger';
import {Match} from '../utils/matchUtils';
import axiosInstance from './axiosInstance';

const getUserId = async () => {
  try {
    // Try to get Firebase token first
    const token = await getAuthToken();
    return token;
  } catch (error) {
    // If Firebase auth fails, use installation ID
    const installationId = await installations().getId();
    return installationId;
  }
};

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

export const getMatches = async (includeHidden = false): Promise<Match[]> => {
  try {
    const userId = await getUserId();
    if (!userId) {
      logger.match.error('No user ID found when getting matches');
      return [];
    }

    logger.match.debug('Getting matches', {
      userId,
      includeHidden,
    });

    const response = await axiosInstance.get(`/users/${userId}/matches`, {
      params: {includeHidden},
    });

    return response.data;
  } catch (error: any) {
    // Only treat 404 as an error if it's a user not found error
    if (
      error.response?.status === 404 &&
      error.response?.data?.error === 'User not found'
    ) {
      logger.match.error('User not found when getting matches', {
        status: error.response?.status,
        statusText: error.response?.statusText,
      });
      throw new Error('User not found');
    }

    // For any other error, log it and throw
    logger.match.error('Failed to fetch matches', {
      status: error.response?.status,
      statusText: error.response?.statusText,
    });
    throw new Error('Failed to fetch matches');
  }
};

export const addMatch = async (
  name: string,
  platform: string,
): Promise<Match | null> => {
  try {
    const userId = await getUserId();
    if (!userId) {
      logger.match.error('No user ID found when adding match');
      return null;
    }

    logger.match.debug('Adding match', {name, platform});
    const response = await axiosInstance.post(`/users/${userId}/matches`, {
      name,
      platform,
    });
    logger.match.debug('Added match', {match: response.data});
    return response.data;
  } catch (error) {
    logger.match.error('Error adding match', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name,
      platform,
    });
    return null;
  }
};

export const deleteMatch = async (
  name: string,
  platform: string,
): Promise<boolean> => {
  try {
    const userId = await getUserId();
    if (!userId) {
      logger.match.error('No user ID found when deleting match');
      return false;
    }

    logger.match.debug('Deleting match', {name, platform});
    await axiosInstance.delete(`/users/${userId}/matches`, {
      data: {name, platform},
    });
    logger.match.debug('Deleted match', {name, platform});
    return true;
  } catch (error) {
    logger.match.error('Error deleting match', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name,
      platform,
    });
    return false;
  }
};

export const hideMatch = async (
  name: string,
  platform: string,
): Promise<boolean> => {
  try {
    const userId = await getUserId();
    if (!userId) {
      logger.match.error('No user ID found when hiding match');
      return false;
    }

    logger.match.debug('Hiding match', {name, platform});
    await axiosInstance.put(`/users/${userId}/matches/hide`, {
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
    const userId = await getUserId();
    if (!userId) {
      logger.match.error('No user ID found when restoring match');
      return false;
    }

    logger.match.debug('Restoring match', {name, platform});
    await axiosInstance.put(`/users/${userId}/matches/restore`, {
      name,
      platform,
    });
    logger.match.debug('Restored match', {name, platform});
    return true;
  } catch (error) {
    logger.match.error('Error restoring match', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name,
      platform,
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
    await axiosInstance.put(`/users/${userId}/matches/last-used`, {
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
