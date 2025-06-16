import {config} from '../config/config';
import logger from './logger';

export const getEnvironmentInfo = () => {
  const envInfo = {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    API_BASE_URL: process.env.API_BASE_URL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '***' : undefined,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    OPENAI_MAX_TOKENS: process.env.OPENAI_MAX_TOKENS,
    OPENAI_TEMPERATURE: process.env.OPENAI_TEMPERATURE,
    OPENAI_MAX_COACH_MESSAGES: process.env.OPENAI_MAX_COACH_MESSAGES,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY ? '***' : undefined,
    GEMINI_MODEL: process.env.GEMINI_MODEL,
    AI_SERVICE: process.env.AI_SERVICE,
    RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS,
    RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS,
    CORS_ORIGIN: process.env.CORS_ORIGIN,
    EMAIL_HOST: process.env.EMAIL_HOST,
    EMAIL_PORT: process.env.EMAIL_PORT,
    EMAIL_SECURE: process.env.EMAIL_SECURE,
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_PASS: process.env.EMAIL_PASS ? '***' : undefined,
    EMAIL_DEFAULT_FROM: process.env.EMAIL_DEFAULT_FROM,
    EMAIL_DEFAULT_REPLY_TO: process.env.EMAIL_DEFAULT_REPLY_TO,
    PRO_DAILY_MESSAGE_LIMIT: process.env.PRO_DAILY_MESSAGE_LIMIT,
    SUPPORT_EMAIL: process.env.SUPPORT_EMAIL,
    PROMPT_VARIANT: process.env.PROMPT_VARIANT,
    DATABASE_TYPE: process.env.DATABASE_TYPE,
    GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS
      ? '***'
      : undefined,
    GOOGLE_APPLICATION_CREDENTIALS_JSON: process.env
      .GOOGLE_APPLICATION_CREDENTIALS_JSON
      ? '***'
      : undefined,
  };

  logger.info('Environment info', envInfo);
  return envInfo;
};

export const getServiceConfig = () => {
  const serviceConfig = {
    openai: {
      model: config.openai.model,
      maxTokens: config.openai.maxTokens,
      temperature: config.openai.temperature,
      maxCoachMessages: config.openai.maxCoachMessages,
    },
    gemini: {
      model: config.gemini.model,
    },
    rateLimit: {
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.max,
    },
  };

  logger.info('Service config', serviceConfig);
  return serviceConfig;
};
