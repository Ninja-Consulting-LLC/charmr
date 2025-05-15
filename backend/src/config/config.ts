import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    port: process.env.PORT || 3001,
    environment: process.env.NODE_ENV || 'development',
    apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3001',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    sandboxMode: process.env.OPENAI_SANDBOX_MODE === 'true',
    maxTokens: parseInt(process.env.MAX_TOKENS || '1000', 10),
    temperature: parseFloat(process.env.TEMPERATURE || '0.7'),
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || 'gemini-1.5-pro',
    sandboxMode: process.env.GEMINI_SANDBOX_MODE === 'true',
    maxTokens: parseInt(process.env.GEMINI_MAX_TOKENS || '1000', 10),
    temperature: parseFloat(process.env.GEMINI_TEMPERATURE || '0.7'),
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  security: {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
    },
  },
  admin: {
    token: process.env.ADMIN_TOKEN,
  },
  email: {
    host: process.env.EMAIL_HOST || 'mailhog',
    port: parseInt(process.env.EMAIL_PORT || '1025', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER || 'test',
    pass: process.env.EMAIL_PASS || 'test',
    defaultFrom: process.env.EMAIL_DEFAULT_FROM || 'noreply@charmr.app',
    defaultReplyTo: process.env.EMAIL_DEFAULT_REPLY_TO || 'support@charmr.app',
  },
  limits: {
    proDailyMessageLimit: parseInt(
      process.env.PRO_DAILY_MESSAGE_LIMIT || '200',
      10,
    ),
  },
} as const;

// Validate required environment variables
const requiredEnvVars = ['OPENAI_API_KEY', 'GEMINI_API_KEY'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar] && process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}
