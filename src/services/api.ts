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
  timeout: 120000, // 2 minute timeout for response generation
});

export const generateReply = async (
  request: GenerateReplyRequest,
): Promise<GenerateReplyResponse> => {
  try {
    console.log('[API] Starting generate reply request', {
      promptLength: request.prompt?.length,
      imageCount: request.images?.length,
      userId: request.userId,
      matchId: request.matchId,
    });

    const response = await api.post<GenerateReplyResponse>(
      '/api/generate-reply',
      request,
    );

    console.log('[API] Received response:', {
      hasReply: !!response.data.reply,
      hasError: !!response.data.error,
      errorType: response.data.type,
      limits: response.data.limits,
    });
    return response.data;
  } catch (error: any) {
    console.error('[API] Error generating reply:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      responseData: error.response?.data,
      isAxiosError: error.isAxiosError,
      stack: error.stack,
    });

    // If we have a response with error data, return it
    if (error.response?.data) {
      console.log('[API] Error response data:', error.response.data);
      return {
        reply: '',
        error: error.response.data.error || 'Failed to generate reply',
        type: error.response.data.type || 'GENERATION_ERROR',
        limits: error.response.data.limits,
      };
    }

    // Handle network errors
    if (error.isAxiosError) {
      if (error.code === 'ECONNABORTED') {
        return {
          reply: '',
          error: 'Request timed out. Please try again.',
          type: 'TIMEOUT_ERROR',
        };
      }
      if (!error.response) {
        return {
          reply: '',
          error: 'Network error. Please check your connection and try again.',
          type: 'NETWORK_ERROR',
        };
      }
    }

    // Handle unexpected errors
    return {
      reply: '',
      error: 'An unexpected error occurred. Please try again.',
      type: 'UNKNOWN_ERROR',
    };
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
