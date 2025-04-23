import path from 'path';
import winston from 'winston';

const {combine, timestamp, printf, colorize} = winston.format;

// Custom format for log messages
const logFormat = printf(({level, message, timestamp, ...meta}) => {
  const metaString = Object.keys(meta).length ? JSON.stringify(meta) : '';
  return `${timestamp} [${level}]: ${message} ${metaString}`;
});

// Create the logger instance
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(timestamp({format: 'YYYY-MM-DD HH:mm:ss'}), logFormat),
  transports: [
    // Console transport for all environments
    new winston.transports.Console({
      format: combine(colorize(), logFormat),
    }),
    // File transport for errors in production
    ...(process.env.NODE_ENV === 'production'
      ? [
          new winston.transports.File({
            filename: path.join('logs', 'error.log'),
            level: 'error',
          }),
          new winston.transports.File({
            filename: path.join('logs', 'combined.log'),
          }),
        ]
      : []),
  ],
});

// Create a separate stream object for Morgan
export const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

export default logger;
