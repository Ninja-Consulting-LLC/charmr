import installations from '@react-native-firebase/installations';
import axios from 'axios';
import {config} from '../config/config';
import {getAuthToken} from '../config/firebase';
import {logger} from '../utils/logger';

// Create an axios instance with default config
const axiosInstance = axios.create({
  baseURL: config.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds timeout
});

// Helper to get anonymous user ID (installation ID)
const getAnonymousUserId = async (): Promise<string | null> => {
  try {
    const installationId = await installations().getId();
    return installationId;
  } catch (error) {
    logger.app.error('Failed to get installation ID:', error);
    return null;
  }
};

// Request interceptor
axiosInstance.interceptors.request.use(
  async request => {
    try {
      // Try to get Firebase token first
      const token = await getAuthToken();
      request.headers.Authorization = `Bearer ${token}`;
    } catch (error) {
      // If Firebase auth fails, use installation ID as anonymous user ID
      const userId = await getAnonymousUserId();
      if (userId) {
        request.headers['X-Anonymous-User'] = userId;
      }
    }

    // Log request details
    logger.app.debug('API Request', {
      method: request.method,
      url: request.url,
      headers: request.headers,
      data: request.data,
    });

    return request;
  },
  error => {
    logger.app.error('API Request Error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return Promise.reject(error);
  },
);

// Response interceptor
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
  error => {
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
