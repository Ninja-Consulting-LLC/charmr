import {Platform} from 'react-native';

const DEV = __DEV__;

// For iOS simulator and Android emulator, localhost maps differently
const getBaseUrl = () => {
  if (DEV) {
    // Development environment
    const localhost = Platform.select({
      ios: 'localhost', // For iOS simulator
      android: '10.0.2.2', // For Android emulator
      default: 'localhost',
    });

    // Check if we're running on a physical device
    const isPhysicalDevice = Platform.OS === 'ios' || Platform.OS === 'android';
    if (isPhysicalDevice) {
      // Use the computer's local IP address
      return 'http://10.0.0.6:3001';
    }

    return `http://${localhost}:3001`;
  }

  // Production environment
  return 'https://your-production-api.com'; // Replace with your actual production API URL
};

export const config = {
  apiBaseUrl: getBaseUrl(),
} as const;

// Type for the config object
export type Config = typeof config;
