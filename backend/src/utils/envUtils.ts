import { config } from '../config/config';
import logger from './logger';

export const getEnvironmentInfo = () => {
  const envInfo = {
    NODE_ENV: process.env.NODE_ENV,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '***' : undefined,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY ? '***' : undefined,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    GEMINI_MODEL: process.env.GEMINI_MODEL,
    PROMPT_VARIANT: process.env.PROMPT_VARIANT,
    RATE_LIMIT_WINDOW: process.env.RATE_LIMIT_WINDOW,
    RATE_LIMIT_MAX: process.env.RATE_LIMIT_MAX,
    SUPPORT_EMAIL: process.env.SUPPORT_EMAIL,
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
