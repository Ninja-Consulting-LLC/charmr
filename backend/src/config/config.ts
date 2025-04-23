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
    maxTokens: parseInt(process.env.MAX_TOKENS || '1000', 10),
    temperature: parseFloat(process.env.TEMPERATURE || '0.7'),
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
    token: process.env.ADMIN_TOKEN || 'dev-admin-token',
  },
  email: {
    host: process.env.EMAIL_HOST || 'mailhog',
    port: parseInt(process.env.EMAIL_PORT || '1025', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER || 'test',
    pass: process.env.EMAIL_PASS || 'test',
    defaultFrom: process.env.EMAIL_DEFAULT_FROM || 'noreply@example.invalid',
    defaultReplyTo: process.env.EMAIL_DEFAULT_REPLY_TO || 'support@example.invalid',
  },
} as const;

// Validate required environment variables
const requiredEnvVars = ['OPENAI_API_KEY'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}
