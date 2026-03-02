import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, {AxiosHeaders} from 'axios';
import {config} from '../config/config';
import {getAuthToken} from '../config/firebase';
import {logger} from '../utils/logger';
import {installationService} from './installationService';

const axiosInstance = axios.create({
  baseURL: config.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

axiosInstance.interceptors.request.use(
  async requestConfig => {
    const headers = new AxiosHeaders(requestConfig.headers);

    try {
      const token = await getAuthToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      } else {
        let userId = await AsyncStorage.getItem('@charmr/userId');
        if (!userId) {
          userId = await installationService.getInstallationId();
          await AsyncStorage.setItem('@charmr/userId', userId);
        }
        headers.set('X-Anonymous-User', userId);
      }
    } catch (error) {
      logger.app.warn('[web-preview] Failed to add auth headers', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    requestConfig.headers = headers;
    return requestConfig;
  },
  error => Promise.reject(error),
);

axiosInstance.interceptors.response.use(
  response => response,
  error => {
    logger.app.error('API Response Error (web preview)', {
      error: error instanceof Error ? error.message : 'Unknown error',
      response: error?.response
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
