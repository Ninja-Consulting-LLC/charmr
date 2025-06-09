import { config } from '../config/config';
import logger from './logger';

export const logEnvironmentVariables = () => {
  const envVars = {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '[REDACTED]' : undefined,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    OPENAI_SANDBOX_MODE: process.env.OPENAI_SANDBOX_MODE,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY ? '[REDACTED]' : undefined,
    GEMINI_MODEL: process.env.GEMINI_MODEL,
    GEMINI_SANDBOX_MODE: process.env.GEMINI_SANDBOX_MODE,
    CORS_ORIGIN: process.env.CORS_ORIGIN,
    RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS,
    RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS,
    MAX_TOKENS: process.env.MAX_TOKENS,
    OPENAI_TEMPERATURE: process.env.OPENAI_TEMPERATURE,
    ADMIN_TOKEN: process.env.ADMIN_TOKEN,
  };

  logger.info('Environment variables', envVars);

  // Log configuration details
  logger.info('Server configuration', {
    environment: config.server.environment,
    port: config.server.port,
    openai: {
      model: config.openai.model,
      sandboxMode: config.openai.sandboxMode,
      maxTokens: config.openai.maxTokens,
      temperature: config.openai.temperature,
    },
    gemini: {
      model: config.gemini.model,
      sandboxMode: config.gemini.sandboxMode,
      maxTokens: config.gemini.maxTokens,
      temperature: config.gemini.temperature,
    },
    rateLimit: {
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.max,
    },
    security: {
      cors: config.security.cors,
    },
    email: {
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      defaultFrom: config.email.defaultFrom,
      defaultReplyTo: config.email.defaultReplyTo,
    },
    limits: {
      proDailyMessageLimit: config.limits.proDailyMessageLimit,
    },
  });
};
