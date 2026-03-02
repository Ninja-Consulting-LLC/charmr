import dotenv from 'dotenv';
import path from 'path';
import {PromptVariant} from '../types';

// Load environment variables from .env file
dotenv.config({path: path.resolve(__dirname, '../../.env')});

const resolvedEmailPort = process.env.SMTP_PORT || '1025';
const resolvedEmailUser = process.env.SMTP_USER;
const resolvedEmailPass = process.env.SMTP_PASS;
const resolvedEmailAuth =
  resolvedEmailUser && resolvedEmailPass
    ? {
        user: resolvedEmailUser,
        pass: resolvedEmailPass,
      }
    : undefined;

export const config = {
  server: {
    port: process.env.PORT || 3001,
    environment: process.env.NODE_ENV || 'development',
    apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3001',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '1000', 10),
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
    maxCoachMessages: parseInt(
      process.env.OPENAI_MAX_COACH_MESSAGES || '10',
      10,
    ),
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || 'gemini-pro-vision',
  },
  ai: {
    defaultService: process.env.AI_SERVICE || 'openai',
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
  email: {
    host: process.env.SMTP_HOST || 'mailhog',
    port: parseInt(resolvedEmailPort, 10),
    secure:
      process.env.SMTP_SECURE === 'true' ||
      resolvedEmailPort === '465',
    auth: resolvedEmailAuth,
    defaultFrom: process.env.SMTP_FROM || 'noreply@charmr.app',
    defaultReplyTo:
      process.env.SMTP_REPLY_TO ||
      process.env.SMTP_FROM ||
      'support@charmr.app',
  },
  limits: {
    proDailyMessageLimit: parseInt(
      process.env.PRO_DAILY_MESSAGE_LIMIT || '200',
      10,
    ),
  },
  supportEmail: process.env.SUPPORT_EMAIL || 'support@charmrapp.com',
  prompt: {
    variant: process.env.PROMPT_VARIANT as PromptVariant | undefined,
  },
} as const;

// Validate required environment variables
const requiredEnvVars = ['OPENAI_API_KEY', 'GEMINI_API_KEY'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar] && process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}
