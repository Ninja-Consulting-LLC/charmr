const apiBaseUrl =
  process.env.API_BASE_URL ||
  process.env.REACT_APP_API_BASE_URL ||
  'http://localhost:3001';

export const config = {
  apiBaseUrl,
  googleWebClientId:
    '86028540367-i6tuu1bh4pkmekqahqdsqv4qj3a6eqvn.apps.googleusercontent.com',
  revenueCatApiKey: '',
} as const;

export type Config = typeof config;
