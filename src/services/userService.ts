import axios from 'axios';
import {config} from '../config/config';
import {SubscriptionTier} from '../types/enums';
import {User} from '../types/user';
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
    console.error('Error fetching user data:', error);
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
}): Promise<User> => {
  const {data} = await axios.post(`${config.apiBaseUrl}/api/users`, userData, {
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Bypass': 'true', // For development only
    },
  });
  return {
    ...data,
    getDailyMessageLimit: () => getPlanLimits(data.plan),
  };
};

export const linkUsers = async (
  anonymousUserId: string,
  registeredUserId: string,
): Promise<void> => {
  await axios.post(
    `${config.apiBaseUrl}/api/users/link`,
    {
      anonymousUserId,
      registeredUserId,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Bypass': 'true', // For development only
      },
    },
  );
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
    console.error('Error finding user by email:', error);
    return null;
  }
};
