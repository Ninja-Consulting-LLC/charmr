import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../services/axiosInstance';
import {logger} from './logger';

export interface Match {
  id: string;
  name: string;
  platform: string;
  lastUsed?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const getMatchKey = (match: Match): string => {
  return `${match.platform}::${match.name}`;
};

export const getMatches = async (includeHidden = false): Promise<Match[]> => {
  try {
    const userId = await AsyncStorage.getItem('userId');
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
    const userId = await AsyncStorage.getItem('userId');
    if (!userId) {
      logger.match.error('No user ID found when adding match');
      return null;
    }

    logger.match.debug('Adding match', {name, platform});
    const response = await axiosInstance.post(`/api/users/${userId}/matches`, {
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
    const userId = await AsyncStorage.getItem('userId');
    if (!userId) {
      logger.match.error('No user ID found when deleting match');
      return false;
    }

    logger.match.debug('Deleting match', {name, platform});
    await axiosInstance.delete(`/api/users/${userId}/matches`, {
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
    const userId = await AsyncStorage.getItem('userId');
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
    const userId = await AsyncStorage.getItem('userId');
    if (!userId) {
      logger.match.error('No user ID found when restoring match');
      return false;
    }

    logger.match.debug('Restoring match', {name, platform});
    await axiosInstance.put(`/api/users/${userId}/matches/restore`, {
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
    const userId = await AsyncStorage.getItem('userId');
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
