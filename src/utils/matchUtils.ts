import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import {config} from '../config/config';
import {matchService} from '../services/matchService';
import {logger} from './logger';

export interface Match {
  id: number;
  userId: string;
  name: string;
  platform: string;
  lastUsed: string | null;
  hidden: boolean;
  createdAt: string;
  updatedAt: string;
}

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

    const response = await axios.get(
      `${config.apiBaseUrl}/api/users/${userId}/matches`,
      {
        params: {includeHidden},
        headers: {
          'X-Auth-Bypass': 'true', // For development only
        },
      },
    );

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

export async function addMatch(
  name: string,
  platform: string,
): Promise<Match | null> {
  try {
    logger.match.debug('Adding match', {name, platform});
    const match = await matchService.addMatch(name, platform);
    logger.match.debug('Added match', {match});
    return match;
  } catch (error) {
    logger.match.error('Error adding match', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name,
      platform,
    });
    return null;
  }
}

export async function deleteMatch(
  name: string,
  platform: string,
): Promise<boolean> {
  try {
    logger.match.debug('Deleting match', {name, platform});
    await matchService.deleteMatch(name, platform);
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
}

export async function hideMatch(
  name: string,
  platform: string,
): Promise<boolean> {
  try {
    logger.match.debug('Hiding match', {name, platform});
    await matchService.hideMatch(name, platform);
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
}

export async function restoreMatch(
  name: string,
  platform: string,
): Promise<boolean> {
  try {
    logger.match.debug('Restoring match', {name, platform});
    await matchService.restoreMatch(name, platform);
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
}

export async function updateMatchLastUsed(
  name: string,
  platform: string,
): Promise<boolean> {
  try {
    logger.match.debug('Updating match last used', {name, platform});
    await matchService.updateMatchLastUsed(name, platform);
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
}

export function generateMatchId(match: Match): string {
  return `${match.platform}::${match.name}`;
}
