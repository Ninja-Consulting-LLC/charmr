import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, {AxiosHeaders} from 'axios';
import {config} from '../config/config';
import {getAuthToken} from '../config/firebase';
import {logger} from '../utils/logger';
import {getUserId} from './authService';
import {installationService} from './installationService';

// Create an axios instance with default config
const axiosInstance = axios.create({
  baseURL: config.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds timeout
});

// Helper to get auth headers
const getAuthHeaders = async () => {
  try {
    // Try to get Firebase token first
    const token = await getAuthToken();
    if (token) {
      logger.app.debug('Using Firebase token for authentication');
      return {
        Authorization: `Bearer ${token}`,
      };
    }
  } catch (error) {
    logger.app.debug('Firebase token not available, falling back to user ID');
  }

  // If Firebase auth fails, try to get user ID
  try {
    const userId = await getUserId();
    if (userId) {
      logger.app.debug('Using user ID for authentication', {userId});
      // Store the user ID in AsyncStorage to ensure consistency
      await AsyncStorage.setItem('@charmr/userId', userId);
      return {
        'X-Anonymous-User': userId,
      };
    }
  } catch (error) {
    logger.app.debug('No user ID available, falling back to installation ID');
  }

  // If all else fails, use installation ID directly
  try {
    const installationId = await installationService.getInstallationId();
    logger.app.debug('Using installation ID for authentication', {
      installationId,
    });
    // Store the installation ID as the user ID for consistency
    await AsyncStorage.setItem('@charmr/userId', installationId);
    return {
      'X-Anonymous-User': installationId,
    };
  } catch (error) {
    logger.app.error('No authentication method available');
    return {};
  }
};

// Add request interceptor to add auth headers to all requests
axiosInstance.interceptors.request.use(
  async config => {
    const headers = await getAuthHeaders();
    const axiosHeaders = new AxiosHeaders(config.headers);

    // Add auth headers
    Object.entries(headers).forEach(([key, value]) => {
      axiosHeaders.set(key, value);
    });

    config.headers = axiosHeaders;
    return config;
  },
  error => {
    return Promise.reject(error);
  },
);

// Response interceptor with retry logic
axiosInstance.interceptors.response.use(
  response => {
    // Log response details
    logger.app.debug('API Response', {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data,
    });
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
