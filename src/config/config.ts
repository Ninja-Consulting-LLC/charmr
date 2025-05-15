import NetInfo from '@react-native-community/netinfo';
import {Platform} from 'react-native';
import Config from 'react-native-config';
import {logger} from '../utils/logger';

// For iOS simulator and Android emulator, localhost maps differently
const getBaseUrl = () => {
  // First check if API_BASE_URL is set
  if (Config.API_BASE_URL) {
    logger.config.debug('Using API_BASE_URL from env:', Config.API_BASE_URL);
    return Config.API_BASE_URL;
  }

  // Fallback to localhost logic if API_BASE_URL is not set
  if (__DEV__) {
    // Development environment
    const localhost = Platform.select({
      ios: Config.LOCAL_IP, // For iOS simulator
      android: '10.0.2.2', // For Android emulator
      default: 'localhost',
    });

    logger.config.debug('Using localhost for API:', `http://${localhost}:3001`);
    return `http://${localhost}:3001`;
  }

  // Production environment fallback
  logger.config.debug('Using production API URL');
  return 'https://your-production-api.com';
};

// Helper to log device network information
const logNetworkInfo = async () => {
  if (__DEV__) {
    try {
      const state = await NetInfo.fetch();
      logger.config.info('Network State:', {
        type: state.type,
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        details: state.details,
      });
    } catch (error) {
      logger.config.error('Error fetching network info:', error);
    }
  }
};

export const config = {
  // API baseUrl is the domain without path
  // Some endpoints use /api/ prefix, but others (like /health) don't
  apiBaseUrl: getBaseUrl(),
  googleWebClientId:
    '86028540367-i6tuu1bh4pkmekqahqdsqv4qj3a6eqvn.apps.googleusercontent.com',
  revenueCatApiKey: 'appl_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
} as const;

// Log all config variables in development
if (__DEV__) {
  logger.config.info('Environment Variables', {
    LOCAL_IP: Config.LOCAL_IP,
    API_BASE_URL: Config.API_BASE_URL,
    NODE_ENV: Config.NODE_ENV,
    PLATFORM: Platform.OS,
    VERSION: Platform.Version,
    // Add any other environment variables you want to log
  });
  logger.config.info('App Config', config);
  logNetworkInfo();
}

// Type for the config object
export type Config = typeof config;
