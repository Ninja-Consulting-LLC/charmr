import {Platform} from 'react-native';
import Config from 'react-native-config';

// For iOS simulator and Android emulator, localhost maps differently
const getBaseUrl = () => {
  if (__DEV__) {
    // Development environment
    const localhost = Platform.select({
      ios: Config.LOCAL_IP, // For iOS simulator
      android: '10.0.2.2', // For Android emulator
      default: 'localhost',
    });

    // Check if we're running on a physical device
    const isPhysicalDevice = Platform.OS === 'ios' || Platform.OS === 'android';
    if (isPhysicalDevice) {
      // For physical devices, use the API_BASE_URL from env
      return Config.API_BASE_URL;
    }

    return `http://${localhost}:3001`;
  }

  // Production environment
  return Config.API_BASE_URL || 'https://your-production-api.com'; // Replace with your actual production API URL
};

export const config = {
  apiBaseUrl: getBaseUrl(),
} as const;

// Log all config variables in development
if (__DEV__) {
  console.log('Environment Variables:', {
    LOCAL_IP: Config.LOCAL_IP,
    API_BASE_URL: Config.API_BASE_URL,
    NODE_ENV: Config.NODE_ENV,
    // Add any other environment variables you want to log
  });
  console.log('App Config:', config);
}

// Type for the config object
export type Config = typeof config;
