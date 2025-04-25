import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import {config} from '../config/config';
import {getAuthToken} from '../config/firebase';
import {UserData} from '../types/user';

interface GenerateReplyRequest {
  prompt: string;
  images: string[];
  userId: string;
  matchId: string;
  skipRateLimiting?: boolean;
}

interface MessageLimit {
  dailyMessagesUsed: number;
  dailyMessageLimit: number;
  extraMessages: number;
}

interface GenerateReplyResponse {
  reply: string;
  error?: string;
  type?: string;
  limits?: MessageLimit;
}

interface SupportRequest {
  userId: string;
  email: string;
  phone?: string;
  message: string;
  plan: string;
  dailyMessagesUsed: number;
  dailyMessageLimit: number;
  extraMessages: number;
}

// Create an axios instance with default config
const api = axios.create({
  baseURL: config.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const generateReply = async (
  request: GenerateReplyRequest,
): Promise<GenerateReplyResponse> => {
  try {
    console.log(
      'Making request to:',
      `${config.apiBaseUrl}/api/generate-reply`,
    );

    const response = await api.post<GenerateReplyResponse>(
      '/api/generate-reply',
      request,
    );

    return response.data;
  } catch (error) {
    console.error('Error generating reply:', error);
    throw error; // Pass through the axios error directly
  }
};

export const testContext = async (): Promise<void> => {
  try {
    console.log(
      'Testing context with URL:',
      `${config.apiBaseUrl}/api/test-context`,
    );
    await api.post('/api/test-context');
  } catch (error) {
    console.error('Error testing context:', error);
    throw error;
  }
};

export const submitSupportRequest = async (
  request: SupportRequest,
  authBypass: boolean = false,
) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Only add auth header if not bypassing auth
  if (!authBypass) {
    headers.Authorization = `Bearer ${await getAuthToken()}`;
  } else {
    // Add auth bypass header
    headers['X-Auth-Bypass'] = 'true';
  }

  const response = await fetch(`${config.apiBaseUrl}/api/support`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error('Failed to submit support request');
  }

  return response.json();
};

export const clearDatabase = async () => {
  try {
    const response = await axios.post(
      `${config.apiBaseUrl}/api/admin/clear-database`,
      {},
      {
        headers: {
          Authorization: 'Bearer dev-admin-token',
        },
      },
    );

    // Also clear AsyncStorage
    await AsyncStorage.clear();

    return response.data;
  } catch (error) {
    console.error('Error clearing database:', error);
    throw error;
  }
};

export const fetchUserData = async (
  userId: string,
): Promise<UserData | null> => {
  try {
    const response = await fetch(`${config.apiBaseUrl}/api/users/${userId}`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Bypass': 'true', // For development only
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user data');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching user data:', error);
    return null;
  }
};
