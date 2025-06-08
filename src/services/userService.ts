import { SubscriptionTier } from '../types/enums';
import { User } from '../types/user';
import { logger } from '../utils/logger';
import { getPlanLimits } from '../utils/planLimits';
import axiosInstance from './axiosInstance';
import { installationService } from './installationService';

export const fetchUserData = async (userId: string): Promise<User | null> => {
  try {
    const {data} = await axiosInstance.get(`/api/users/${userId}`);
    return {
      ...data,
      getDailyMessageLimit: () => getPlanLimits(data.plan),
    };
  } catch (error) {
    logger.app.error('Error fetching user data:', error);
    return null;
  }
};

export const updateUserPlan = async (
  userId: string,
  plan: SubscriptionTier,
): Promise<User> => {
  try {
    const {data} = await axiosInstance.put(`/api/users/${userId}/plan`, {plan});
    return {
      ...data,
      getDailyMessageLimit: () => getPlanLimits(data.plan),
    };
  } catch (error) {
    logger.app.error('Error updating user plan:', error);
    throw error;
  }
};

export const createUser = async (userData: {
  id: string;
  email: string;
  name: string;
  installationId?: string;
}): Promise<User> => {
  try {
    const {data} = await axiosInstance.post('/api/users', userData);
    return {
      ...data,
      getDailyMessageLimit: () => getPlanLimits(data.plan),
    };
  } catch (error) {
    logger.app.error('Error creating user:', error);
    throw error;
  }
};

export const createAnonymousUser = async (): Promise<User> => {
  try {
    const installationId = await installationService.getInstallationId();
    logger.app.debug('Creating new anonymous user with installation ID', {
      installationId,
    });

    // First check if user already exists
    try {
      const existingUser = await findUserByInstallationId(installationId);
      if (existingUser) {
        logger.app.debug('Found existing anonymous user', {
          userId: existingUser.id,
          installationId,
        });
        return {
          ...existingUser,
          getDailyMessageLimit: () => getPlanLimits(existingUser.plan),
        };
      }
    } catch (error) {
      logger.app.warn('Error checking for existing user:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
    }

    // If no existing user found, create a new one
    const newUser = await axiosInstance.post('/api/users', {
      id: installationId,
      email: installationId,
      name: 'Anonymous User',
      installationId,
    });

    return {
      ...newUser.data,
      getDailyMessageLimit: () => getPlanLimits(newUser.data.plan),
    };
  } catch (error) {
    logger.app.error('Error creating anonymous user', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
};

export const linkUsers = async (
  anonymousUserId: string,
  registeredUserId: string,
): Promise<void> => {
  try {
    const installationId = await installationService.getInstallationId();
    logger.app.info('Linking users with data:', {
      anonymousUserId,
      registeredUserId,
      installationId,
    });
    await axiosInstance.post('/api/users/link', {
      anonymousUserId,
      registeredUserId,
      installationId,
    });
  } catch (error) {
    logger.app.error('Error linking users:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      anonymousUserId,
      registeredUserId,
    });
    throw error;
  }
};

export const linkAnonymousUser = async (
  anonymousUserId: string,
  registeredUserId: string,
): Promise<void> => {
  try {
    const installationId = await installationService.getInstallationId();
    await axiosInstance.post('/api/users/link', {
      anonymousUserId,
      registeredUserId,
      installationId,
    });
  } catch (error) {
    logger.app.error('Error linking users:', error);
    throw error;
  }
};

export const findUserByEmail = async (email: string): Promise<User | null> => {
  try {
    const {data} = await axiosInstance.get(
      `/api/users/email/${encodeURIComponent(email)}`,
    );
    return {
      ...data,
      getDailyMessageLimit: () => getPlanLimits(data.plan),
    };
  } catch (error) {
    logger.app.error('Error finding user by email:', error);
    return null;
  }
};

export const findUserByInstallationId = async (
  installationId: string,
): Promise<User | null> => {
  try {
    const {data} = await axiosInstance.get(
      `/api/users/installation/${installationId}`,
    );
    return {
      ...data,
      getDailyMessageLimit: () => getPlanLimits(data.plan),
    };
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    logger.app.error('Error finding user by installation ID:', error);
    throw error;
  }
};

// Get user profile
export const getUserProfile = async (userId: string) => {
  try {
    const response = await axiosInstance.get(`/api/users/${userId}`);
    return response.data;
  } catch (error) {
    logger.app.error('Failed to get user profile:', error);
    throw error;
  }
};

// Update user profile
export const updateUserProfile = async (userId: string, data: any) => {
  try {
    // If only deviceToken is being updated, use the dedicated endpoint with retry logic
    if (
      Object.keys(data).length === 1 &&
      Object.prototype.hasOwnProperty.call(data, 'deviceToken')
    ) {
      const maxRetries = 3;
      const initialDelay = 1000; // 1 second

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const response = await axiosInstance.put(
            `/api/users/${userId}/device-token`,
            data,
          );
          return response.data;
        } catch (error: any) {
          // If it's not a rate limit error or it's the last attempt, throw the error
          if (error?.response?.status !== 429 || attempt === maxRetries - 1) {
            throw error;
          }

          // Calculate delay with exponential backoff
          const delay = initialDelay * Math.pow(2, attempt);
          logger.app.info(
            'Rate limited when updating device token, retrying...',
            {
              attempt: attempt + 1,
              maxRetries,
              delay,
              userId,
            },
          );

          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // Otherwise, use the generic endpoint (if/when it exists)
    const response = await axiosInstance.put(`/api/users/${userId}`, data);
    return response.data;
  } catch (error) {
    logger.app.error('Failed to update user profile:', error);
    throw error;
  }
};

// Delete user account
export const deleteUserAccount = async (userId: string) => {
  try {
    const response = await axiosInstance.delete(`/api/users/${userId}`);
    return response.data;
  } catch (error) {
    logger.app.error('Failed to delete user account:', error);
    throw error;
  }
};

// Get user settings
export const getUserSettings = async (userId: string) => {
  try {
    const response = await axiosInstance.get(`/api/users/${userId}/settings`);
    return response.data;
  } catch (error) {
    logger.app.error('Failed to get user settings:', error);
    throw error;
  }
};

// Update user settings
export const updateUserSettings = async (userId: string, settings: any) => {
  try {
    const response = await axiosInstance.put(
      `/api/users/${userId}/settings`,
      settings,
    );
    return response.data;
  } catch (error) {
    logger.app.error('Failed to update user settings:', error);
    throw error;
  }
};
