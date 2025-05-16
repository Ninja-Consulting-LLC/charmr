import axios from 'axios';
import {config} from '../config/config';
import {getAuthToken} from '../config/firebase';
import {getStore} from '../store/StoreProvider';
import {logger} from '../utils/logger';

// Create an axios instance with default config
const axiosInstance = axios.create({
  baseURL: config.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds timeout
});

// Request interceptor
axiosInstance.interceptors.request.use(
  async request => {
    try {
      // Try to get Firebase token first
      const token = await getAuthToken();
      request.headers.Authorization = `Bearer ${token}`;
      logger.app.debug('Using Firebase token for authentication');
    } catch (error) {
      logger.app.debug(
        'Firebase token not available, falling back to installation ID',
      );
      // If Firebase auth fails, use installation ID as anonymous user ID
      try {
        const {getInstallationId} = getStore();
        const userId = await getInstallationId();
        request.headers['X-Anonymous-User'] = userId;
        logger.app.debug('Using installation ID for authentication');
      } catch (error) {
        logger.app.error('No authentication method available');
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
