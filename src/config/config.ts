import {Platform} from 'react-native';

const DEV = __DEV__;

// For iOS simulator and Android emulator, localhost maps differently
const getBaseUrl = () => {
  if (DEV) {
    // Development environment
    const localhost = Platform.select({
      ios: 'localhost',
      android: '10.0.2.2', // Android Studio emulator maps localhost to 10.0.2.2
      default: 'localhost',
    });
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
