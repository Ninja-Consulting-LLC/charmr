import {Platform} from 'react-native';
import Config from 'react-native-config';
import {logger} from '../utils/logger';

const siteBaseUrl = 'https://ninja-consulting-llc.github.io/charmr';

// For iOS simulator and Android emulator, localhost maps differently
// TODO: this isn't actually used anywhere, remove eventually
const getBaseUrl = () => {
  // Debug logging for environment variables
  logger.config.debug('Environment Variables Debug:', {
    LOCAL_IP: Config.LOCAL_IP,
    API_BASE_URL: Config.API_BASE_URL,
    NODE_ENV: Config.NODE_ENV,
    PLATFORM: Platform.OS,
    VERSION: Platform.Version,
    __DEV__: __DEV__,
  });

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
  return 'https://ai-dating-keyboard.onrender.com';
};

export const config = {
  // API baseUrl is the domain without path
  // Some endpoints use /api/ prefix, but others (like /health) don't
  apiBaseUrl: getBaseUrl(),
  siteBaseUrl,
  legal: {
    termsUrl: `${siteBaseUrl}/terms.html`,
    privacyUrl: `${siteBaseUrl}/privacy.html`,
  },
  googleWebClientId:
    '86028540367-i6tuu1bh4pkmekqahqdsqv4qj3a6eqvn.apps.googleusercontent.com',
  revenueCatApiKey: Platform.select({
    ios: Config.REVENUECAT_IOS_API_KEY || '',
    android: Config.REVENUECAT_ANDROID_API_KEY || '',
    default: '',
  }),
  chat: {
    pageSize: parseInt(Config.CHAT_PAGE_SIZE || '20', 10),
  },
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
}

// Type for the config object
export type Config = typeof config;
