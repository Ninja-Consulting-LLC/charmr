import AsyncStorage from '@react-native-async-storage/async-storage';
import { getInstallations } from '@react-native-firebase/installations';
import axios, { AxiosHeaders } from 'axios';
import { config } from '../config/config';
import { getAuthToken } from '../config/firebase';
import { logger } from '../utils/logger';
import { getUserId } from './authService';
import { installationService } from './installationService';

// Create an axios instance with default config
const axiosInstance = axios.create({
  baseURL: config.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout for coach mode
});

// Helper to get auth headers
const getAuthHeaders = async () => {
  try {
    // Try to get Firebase token first
    const token = await getAuthToken();
    if (token) {
      console.log('[AUTH] Using Firebase token for authentication');
      return {
        Authorization: `Bearer ${token}`,
      };
    }
    console.log('[AUTH] No Firebase token available');
  } catch (error) {
    console.log(
      '[AUTH] Firebase token error:',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }

  // If Firebase auth fails, try to get user ID
  try {
    const userId = await getUserId();
    if (userId) {
      console.log('[AUTH] Using user ID for authentication:', userId);
      // Store the user ID in AsyncStorage to ensure consistency
      await AsyncStorage.setItem('@charmr/userId', userId);
      return {
        'X-Anonymous-User': userId,
      };
    }
    console.log('[AUTH] No user ID available from getUserId');
  } catch (error) {
    console.log(
      '[AUTH] getUserId error:',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }

  // If all else fails, use installation ID directly
  try {
    const installationId = await installationService.getInstallationId();
    if (!installationId) {
      console.log('[AUTH] No installation ID available');
      throw new Error('No installation ID available');
    }

    console.log(
      '[AUTH] Using installation ID for authentication:',
      installationId,
    );

    // Store the installation ID as the user ID for consistency
    await AsyncStorage.setItem('@charmr/userId', installationId);

    // Ensure we have a valid installation ID
    if (installationId.length < 10) {
      console.log('[AUTH] Invalid installation ID format:', installationId);
      throw new Error('Invalid installation ID format');
    }

    return {
      'X-Anonymous-User': installationId,
    };
  } catch (error) {
    console.log(
      '[AUTH] Installation ID error:',
      error instanceof Error ? error.message : 'Unknown error',
    );

    // If we get here, we have no valid authentication method
    // Try to get a fresh installation ID as a last resort
    try {
      const freshInstallationId = await getInstallations().getId();
      if (freshInstallationId) {
        console.log(
          '[AUTH] Using fresh installation ID as last resort:',
          freshInstallationId,
        );
        await AsyncStorage.setItem('@charmr/userId', freshInstallationId);
        return {
          'X-Anonymous-User': freshInstallationId,
        };
      }
    } catch (lastResortError) {
      console.log(
        '[AUTH] Failed to get fresh installation ID:',
        lastResortError instanceof Error
          ? lastResortError.message
          : 'Unknown error',
      );
    }

    console.log('[AUTH] No authentication method available');
    return {};
  }
};

// Add request interceptor to add auth headers to all requests
axiosInstance.interceptors.request.use(
  async config => {
    try {
      // Try to get Firebase token first
      const token = await getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        return config;
      }

      // Fall back to user ID if no token
      const userId = await AsyncStorage.getItem('@charmr/userId');
      if (userId) {
        config.headers['X-Anonymous-User'] = userId;
      }
      return config;
    } catch (error) {
      return config;
    }
  },
  error => {
    return Promise.reject(error);
  },
);

// Response interceptor with retry logic
axiosInstance.interceptors.response.use(
  response => {
    return response;
  },
  async error => {
    const originalRequest = error.config;

    // If the error is a 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Get fresh auth headers
        const authHeaders = await getAuthHeaders();
        const headers = new AxiosHeaders(originalRequest.headers);

        // Add auth headers
        Object.entries(authHeaders).forEach(([key, value]) => {
          headers.set(key, value);
        });

        originalRequest.headers = headers;

        // Retry the request
        return axiosInstance(originalRequest);
      } catch (retryError) {
        logger.app.error('Retry failed', {
          error:
            retryError instanceof Error ? retryError.message : 'Unknown error',
          stack: retryError instanceof Error ? retryError.stack : undefined,
        });
      }
    }

    // Log error details
    logger.app.error('API Response Error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      response: error.response
        ? {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data,
          }
        : undefined,
    });
    return Promise.reject(error);
  },
);

export default axiosInstance;
