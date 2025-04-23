import logger from './logger';

export const logEnvironmentVariables = () => {
  const envVars = {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '[REDACTED]' : undefined,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    OPENAI_SANDBOX_MODE: process.env.OPENAI_SANDBOX_MODE,
    CORS_ORIGIN: process.env.CORS_ORIGIN,
    RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS,
    RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS,
    MAX_TOKENS: process.env.MAX_TOKENS,
    TEMPERATURE: process.env.TEMPERATURE,
  };

  logger.info('Environment variables', envVars);
};
