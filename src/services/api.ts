import NetInfo from '@react-native-community/netinfo';
import {getAuthToken} from '../config/firebase';
import {UserData} from '../types/user';
import {logger} from '../utils/logger';
import axiosInstance from './axiosInstance';

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

export const generateReply = async (
  request: GenerateReplyRequest,
): Promise<GenerateReplyResponse> => {
  try {
    logger.app.info('[API] Starting generate reply request', {
      promptLength: request.prompt?.length,
      imageCount: request.images?.length,
      userId: request.userId,
      matchId: request.matchId,
    });

    const response = await axiosInstance.post<GenerateReplyResponse>(
      '/api/generate-reply',
      request,
    );

    logger.app.info('[API] Received response:', {
      hasReply: !!response.data.reply,
      hasError: !!response.data.error,
      errorType: response.data.type,
      limits: response.data.limits,
    });
    return response.data;
  } catch (error: any) {
    logger.app.error('[API] Error generating reply', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      responseData: error.response?.data,
      isAxiosError: error.isAxiosError,
      stack: error.stack,
    });

    // If we have a response with error data, return it
    if (error.response?.data) {
      logger.app.info('[API] Error response data', error.response.data);
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

  const response = await axiosInstance.post('/api/support', request, {
    headers,
  });
  return response.data;
};

export const fetchUserData = async (
  userId: string,
): Promise<UserData | null> => {
  try {
    const response = await axiosInstance.get(`/api/users/${userId}`, {
      headers: {
        'X-Auth-Bypass': 'true', // For development only
      },
    });

    return response.data;
  } catch (error) {
    logger.app.error('Error fetching user data:', error);
    return null;
  }
};

export const getNetworkInfo = async () => {
  logger.app.info('Getting network information');

  try {
    const networkState = await NetInfo.fetch();

    logger.app.info('Network state:', {
      isConnected: networkState.isConnected,
      isInternetReachable: networkState.isInternetReachable,
      type: networkState.type,
      details: networkState.details,
    });

    return {
      isConnected: networkState.isConnected,
      isInternetReachable: networkState.isInternetReachable,
      type: networkState.type,
      details: networkState.details,
    };
  } catch (error) {
    logger.app.error('Error getting network info', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

export const resetDb = async () => {
  try {
    const response = await axiosInstance.post(
      '/api/admin/reset-db',
      {},
      {
        headers: {
          Authorization: `Bearer ${process.env.ADMIN_TOKEN || 'admin_secret'}`,
          'X-Auth-Bypass': 'true', // For development only
        },
      },
    );
    return response.data;
  } catch (error) {
    logger.app.error('Error resetting database:', error);
    throw error;
  }
};

export const testContext = async () => {
  try {
    const response = await axiosInstance.post(
      '/api/admin/test-context',
      {},
      {
        headers: {
          'X-Auth-Bypass': 'true', // For development only
        },
      },
    );
    return response.data;
  } catch (error) {
    logger.app.error('Error testing context:', error);
    throw error;
  }
};

export const testApi = async () => {
  try {
    const response = await axiosInstance.get('/api/test');
    return response.data;
  } catch (error) {
    logger.app.error('API test failed:', error);
    throw error;
  }
};

export const testAuth = async () => {
  try {
    const response = await axiosInstance.get('/api/auth/test');
    return response.data;
  } catch (error) {
    logger.app.error('Auth test failed:', error);
    throw error;
  }
};

export const getConfig = async () => {
  try {
    const response = await axiosInstance.get('/api/config');
    return response.data;
  } catch (error) {
    logger.app.error('Failed to get config:', error);
    throw error;
  }
};

export const updateConfig = async (config: any) => {
  try {
    const response = await axiosInstance.put('/api/config', config);
    return response.data;
  } catch (error) {
    logger.app.error('Failed to update config:', error);
    throw error;
  }
};
