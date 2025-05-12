import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_BASE_URL} from '../config';
import {logger} from '../utils/logger';
import {Match} from '../utils/matchUtils';

const getUserId = async () => {
  const userId = await AsyncStorage.getItem('userId');
  if (!userId) {
    throw new Error('User not authenticated');
  }
  return userId;
};

export const matchService = {
  async getMatches(includeHidden: boolean = false): Promise<Match[]> {
    const userId = await getUserId();
    logger.match.debug('Getting matches', {userId, includeHidden});

    const response = await fetch(
      `${API_BASE_URL}/users/${userId}/matches?includeHidden=${includeHidden}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      },
    );

    if (!response.ok) {
      const errorData = {
        status: response.status,
        statusText: response.statusText,
      };
      logger.match.error('Failed to fetch matches', errorData);
      throw new Error('Failed to fetch matches');
    }

    const matches = await response.json();
    logger.match.debug('Received matches', {count: matches.length});
    return matches;
  },

  async addMatch(name: string, platform: string): Promise<Match> {
    const userId = await getUserId();
    logger.match.debug('Adding match', {name, platform, userId});

    const response = await fetch(`${API_BASE_URL}/users/${userId}/matches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({name, platform}),
    });

    if (!response.ok) {
      const errorData = {
        status: response.status,
        statusText: response.statusText,
        name,
        platform,
      };
      logger.match.error('Failed to add match', errorData);
      throw new Error('Failed to add match');
    }

    const match = await response.json();
    logger.match.debug('Added match', {match});
    return match;
  },

  async deleteMatch(name: string, platform: string): Promise<void> {
    const userId = await getUserId();
    const response = await fetch(`${API_BASE_URL}/users/${userId}/matches`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({name, platform}),
    });

    if (!response.ok) {
      throw new Error('Failed to delete match');
    }
  },

  async hideMatch(name: string, platform: string): Promise<void> {
    const userId = await getUserId();
    const response = await fetch(
      `${API_BASE_URL}/users/${userId}/matches/hide`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({name, platform}),
      },
    );

    if (!response.ok) {
      throw new Error('Failed to hide match');
    }
  },

  async restoreMatch(name: string, platform: string): Promise<void> {
    const userId = await getUserId();
    const response = await fetch(
      `${API_BASE_URL}/users/${userId}/matches/restore`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({name, platform}),
      },
    );

    if (!response.ok) {
      throw new Error('Failed to restore match');
    }
  },

  async updateMatchLastUsed(name: string, platform: string): Promise<void> {
    const userId = await getUserId();
    const response = await fetch(
      `${API_BASE_URL}/users/${userId}/matches/last-used`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({name, platform}),
      },
    );

    if (!response.ok) {
      throw new Error('Failed to update match last used');
    }
  },
};
