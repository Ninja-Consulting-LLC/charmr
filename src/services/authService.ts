import {config} from '../config/config';
import {getAuthToken} from '../config/firebase';
import {logger} from '../utils/logger';
import {installationService} from './installationService';

export const getUserId = async (): Promise<string> => {
  try {
    // Try to get Firebase token first
    const token = await getAuthToken();
    if (!token) {
      throw new Error('No Firebase token available');
    }

    // Extract user ID from token
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      throw new Error('Invalid token format');
    }

    const payload = JSON.parse(atob(tokenParts[1]));
    const userId = payload.user_id;

    if (!userId) {
      throw new Error('No user ID in token');
    }

    // Check if this is a new Firebase user that hasn't been created in our backend yet
    try {
      const response = await fetch(`${config.apiBaseUrl}/api/users/${userId}`);
      if (!response.ok) {
        // If user doesn't exist in our backend, use installation ID
        logger.app.debug(
          'Firebase user not found in backend, using installation ID',
        );
        const installationId = await installationService.getInstallationId();
        return installationId;
      }
    } catch (error) {
      logger.app.debug('Error checking user existence, using installation ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      const installationId = await installationService.getInstallationId();
      return installationId;
    }

    return userId;
  } catch (error) {
    logger.app.debug('Falling back to installation ID for user ID', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    // If Firebase auth fails, use installation ID
    const installationId = await installationService.getInstallationId();
    return installationId;
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
