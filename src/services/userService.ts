import installations from '@react-native-firebase/installations';
import axios from 'axios';
import {SubscriptionTier} from '../types/enums';
import {User} from '../types/user';
import {logger} from '../utils/logger';
import {getPlanLimits} from '../utils/planLimits';
import axiosInstance from './axiosInstance';

export const fetchUserData = async (userId: string): Promise<User | null> => {
  try {
    const {data} = await axiosInstance.get(`/users/${userId}`);
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
  try {
    await axiosInstance.put(`/users/${userId}/plan`, {plan});
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
    const {data} = await axiosInstance.post('/users', userData);
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

    await axiosInstance.post('/users/link', {
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
      `/users/email/${encodeURIComponent(email)}`,
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
      `/users/installation/${installationId}`,
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

// Get user profile
export const getUserProfile = async (userId: string) => {
  try {
    const response = await axiosInstance.get(`/users/${userId}`);
    return response.data;
  } catch (error) {
    logger.app.error('Failed to get user profile:', error);
    throw error;
  }
};

// Update user profile
export const updateUserProfile = async (userId: string, data: any) => {
  try {
    const response = await axiosInstance.put(`/users/${userId}`, data);
    return response.data;
  } catch (error) {
    logger.app.error('Failed to update user profile:', error);
    throw error;
  }
};

// Delete user account
export const deleteUserAccount = async (userId: string) => {
  try {
    const response = await axiosInstance.delete(`/users/${userId}`);
    return response.data;
  } catch (error) {
    logger.app.error('Failed to delete user account:', error);
    throw error;
  }
};

// Get user settings
export const getUserSettings = async (userId: string) => {
  try {
    const response = await axiosInstance.get(`/users/${userId}/settings`);
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
      `/users/${userId}/settings`,
      settings,
    );
    return response.data;
  } catch (error) {
    logger.app.error('Failed to update user settings:', error);
    throw error;
  }
};
