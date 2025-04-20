import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    port: process.env.PORT || 3001,
    environment: process.env.NODE_ENV || 'development',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4-vision-preview',
    sandboxMode: process.env.OPENAI_SANDBOX_MODE === 'true',
    maxTokens: process.env.MAX_TOKENS ? parseInt(process.env.MAX_TOKENS) : 1000,
    temperature: process.env.TEMPERATURE
      ? parseFloat(process.env.TEMPERATURE)
      : 0.7,
  },
  rateLimit: {
    windowMs: process.env.RATE_LIMIT_WINDOW_MS
      ? parseInt(process.env.RATE_LIMIT_WINDOW_MS)
      : 15 * 60 * 1000, // 15 minutes default
    max: process.env.RATE_LIMIT_MAX_REQUESTS
      ? parseInt(process.env.RATE_LIMIT_MAX_REQUESTS)
      : 100, // 100 requests default
  },
  security: {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
    },
  },
} as const;

// Validate required environment variables
const requiredEnvVars = ['OPENAI_API_KEY'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}
