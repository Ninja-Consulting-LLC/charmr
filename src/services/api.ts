import NetInfo from '@react-native-community/netinfo';
import {isAxiosError} from 'axios';
import {getAuthToken} from '../config/firebase';
import {MessageMode} from '../types/enums';
import {GenerateReplyRequest, GenerateReplyResponse} from '../types/message';
import {UserData} from '../types/user';
import {logger} from '../utils/logger';
import axiosInstance from './axiosInstance';

interface SupportRequest {
  userId: string;
  email: string;
  phone?: string;
  message: string;
  plan: string;
  dailyMessagesUsed: number;
  dailyMessageLimit: number;
  extraMessages: number;
  name?: string;
}

export const generateReply = async (
  request: GenerateReplyRequest,
): Promise<GenerateReplyResponse> => {
  try {
    logger.app.debug('[API] Starting generate reply request', {
      promptLength: request.prompt?.length,
      imageCount: request.images?.length,
      userId: request.userId,
      matchId: request.matchId,
    });

    const response = await axiosInstance.post<GenerateReplyResponse>(
      '/api/generate-reply',
      request,
    );

    logger.app.debug('[API] Received response:', {
      hasReply: !!response.data.reply,
      hasError: !!response.data.error,
      errorType: response.data.type,
      limits: response.data.limits,
    });
    return response.data;
  } catch (error: unknown) {
    const errMeta = isAxiosError(error)
      ? {
          message: error.message,
          code: error.code,
          status: error.response?.status,
          responseData: error.response?.data,
          isAxiosError: true as const,
          stack: error.stack,
        }
      : {
          message: error instanceof Error ? error.message : String(error),
          isAxiosError: false as const,
          stack: error instanceof Error ? error.stack : undefined,
        };

    logger.app.error('[API] Error generating reply', errMeta);

    // If we have a response with error data, return it
    if (isAxiosError(error) && error.response?.data) {
      const data = error.response.data as {
        error?: string;
        type?: string;
        limits?: GenerateReplyResponse['limits'];
      };
      logger.app.debug('[API] Error response data', data);
      return {
        reply: '',
        error: data.error || 'Failed to generate reply',
        type: data.type || 'GENERATION_ERROR',
        limits: data.limits,
        mode: MessageMode.GENERATE,
      };
    }

    // Handle network errors
    if (isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        return {
          reply: '',
          error: 'Request timed out. Please try again.',
          type: 'TIMEOUT_ERROR',
          mode: MessageMode.GENERATE,
        };
      }
      if (!error.response) {
        return {
          reply: '',
          error: 'Network error. Please check your connection and try again.',
          type: 'NETWORK_ERROR',
          mode: MessageMode.GENERATE,
        };
      }
    }

    // Handle unexpected errors
    return {
      reply: '',
      error: 'An unexpected error occurred. Please try again.',
      type: 'UNKNOWN_ERROR',
      mode: MessageMode.GENERATE,
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

  if (authBypass) {
    headers['X-Auth-Bypass'] = 'true';
  } else {
    const token = await getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    // No Firebase user: omit Authorization so axios interceptor adds X-Anonymous-User
  }

  const response = await axiosInstance.post('/api/support', request, {
    headers,
    timeout: 20000,
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
  logger.app.debug('Getting network information');

  try {
    const networkState = await NetInfo.fetch();

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
          Authorization: `Bearer ${await getAuthToken()}`,
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
          Authorization: `Bearer ${await getAuthToken()}`,
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

export const updateConfig = async (payload: Record<string, unknown>) => {
  try {
    const response = await axiosInstance.put('/api/config', payload);
    return response.data;
  } catch (error) {
    logger.app.error('Failed to update config:', error);
    throw error;
  }
};
