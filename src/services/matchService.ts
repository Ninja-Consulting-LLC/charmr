import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_BASE_URL} from '../config';
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
    console.log('[matchService] Getting matches with params:', {
      userId,
      includeHidden,
    });
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
      console.error('[matchService] Failed to fetch matches:', {
        status: response.status,
        statusText: response.statusText,
      });
      throw new Error('Failed to fetch matches');
    }

    const matches = await response.json();
    console.log('[matchService] Received matches:', {
      count: matches.length,
      matches,
    });
    return matches;
  },

  async addMatch(name: string, platform: string): Promise<Match> {
    const userId = await getUserId();
    const response = await fetch(`${API_BASE_URL}/users/${userId}/matches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({name, platform}),
    });

    if (!response.ok) {
      throw new Error('Failed to add match');
    }

    return response.json();
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
