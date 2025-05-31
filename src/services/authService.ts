import AsyncStorage from '@react-native-async-storage/async-storage';
import {config} from '../config/config';
import {getAuthToken} from '../config/firebase';
import {logger} from '../utils/logger';
import {installationService} from './installationService';

export const getUserId = async (): Promise<string | null> => {
  try {
    // First check if we have a stored user ID
    const storedUserId = await AsyncStorage.getItem('@charmr/userId');
    if (storedUserId) {
      logger.app.debug('Found stored user ID', {userId: storedUserId});
      return storedUserId;
    }

    // Try to get Firebase token next
    const token = await getAuthToken();
    if (!token) {
      logger.app.debug('No Firebase token available');
      return null;
    }

    // Extract user ID from token
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      logger.app.error('Invalid token format');
      return null;
    }

    const payload = JSON.parse(atob(tokenParts[1]));
    const userId = payload.user_id;

    if (!userId) {
      logger.app.error('No user ID in token');
      return null;
    }

    // Check if this is a new Firebase user that hasn't been created in our backend yet
    try {
      const response = await fetch(`${config.apiBaseUrl}/api/users/${userId}`);
      if (!response.ok) {
        // If user doesn't exist in our backend, create them
        logger.app.debug('Firebase user not found in backend, creating user');
        const installationId = await installationService.getInstallationId();
        const createResponse = await fetch(`${config.apiBaseUrl}/api/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            id: userId,
            email: payload.email,
            name: payload.name || payload.email,
            installationId,
          }),
        });

        if (!createResponse.ok) {
          logger.app.error('Failed to create user in backend');
          return null;
        }

        return userId;
      }
    } catch (error) {
      logger.app.error('Error checking/creating user in backend', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }

    return userId;
  } catch (error) {
    logger.app.error('Error getting user ID', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
};

export const isAuthenticated = async (): Promise<boolean> => {
  try {
    await getAuthToken();
    return true;
  } catch (error) {
    return false;
  }
};

export const clearAuthData = async (): Promise<void> => {
  try {
    // Clear all user-related data except installation ID
    await AsyncStorage.multiRemove([
      '@charmr/user_data',
      '@charmr/user_settings',
      '@charmr/user_profile',
      '@charmr/auth_token',
      '@charmr/user',
      '@charmr/userId',
      '@charmr/isAuthenticated',
      '@charmr/email',
      '@charmr/name',
      '@charmr/plan',
      '@charmr/dailyMessagesUsed',
      '@charmr/extraMessages',
      '@charmr/lastResetDate',
    ]);

    logger.app.info('Cleared all auth-related data');
  } catch (error) {
    logger.app.error('Error clearing auth data:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
};
