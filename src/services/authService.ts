import {getAuthToken} from '../config/firebase';
import {installationService} from './installationService';

export const getUserId = async (): Promise<string> => {
  try {
    // Try to get Firebase token first
    const token = await getAuthToken();
    return token;
  } catch (error) {
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
