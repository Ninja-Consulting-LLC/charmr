import installations from '@react-native-firebase/installations';
import axios from 'axios';
import {config} from '../config/config';
import {SubscriptionTier} from '../types/enums';
import {User} from '../types/user';
import {logger} from '../utils/logger';
import {getPlanLimits} from '../utils/planLimits';

export const fetchUserData = async (userId: string): Promise<User | null> => {
  try {
    const {data} = await axios.get(`${config.apiBaseUrl}/api/users/${userId}`, {
      headers: {
        'X-Auth-Bypass': 'true', // For development only
      },
    });
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
): Promise<void> => {
  await axios.put(
    `${config.apiBaseUrl}/api/users/${userId}/plan`,
    {plan},
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Bypass': 'true', // For development only
      },
    },
  );
};

export const createUser = async (userData: {
  id: string;
  email: string;
  name: string;
  installationId?: string;
}): Promise<User> => {
  try {
    const {data} = await axios.post(
      `${config.apiBaseUrl}/api/users`,
      userData,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Bypass': 'true', // For development only
        },
      },
    );
    return {
      ...data,
      getDailyMessageLimit: () => getPlanLimits(data.plan),
    };
  } catch (error) {
    logger.app.error('Error creating user:', error);
    throw error;
  }
};

export const linkUsers = async (
  anonymousUserId: string,
  registeredUserId: string,
): Promise<void> => {
  try {
    // Get the installation ID with retry logic
    let installationId;
    try {
      installationId = await installations().getId();
    } catch (error) {
      logger.app.error('Failed to get installation ID:', error);
      // Continue without installation ID if retrieval fails
      installationId = undefined;
    }

    await axios.post(
      `${config.apiBaseUrl}/api/users/link`,
      {
        anonymousUserId,
        registeredUserId,
        installationId,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Bypass': 'true', // For development only
        },
      },
    );
  } catch (error) {
    logger.app.error('Error linking users:', error);
    throw error;
  }
};

export const findUserByEmail = async (email: string): Promise<User | null> => {
  try {
    const {data} = await axios.get(
      `${config.apiBaseUrl}/api/users/email/${encodeURIComponent(email)}`,
      {
        headers: {
          'X-Auth-Bypass': 'true', // For development only
        },
      },
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
    const {data} = await axios.get(
      `${config.apiBaseUrl}/api/users/installation/${installationId}`,
      {
        headers: {
          'X-Auth-Bypass': 'true', // For development only
        },
      },
    );
    return {
      ...data,
      getDailyMessageLimit: () => getPlanLimits(data.plan),
    };
  } catch (error) {
    // Only log 404 errors to console, suppress other errors
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      logger.app.error('Error finding user by installation ID', error);
    }
    return null;
  }
};
