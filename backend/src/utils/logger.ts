import path from 'path';
import winston from 'winston';

const {combine, timestamp, printf, colorize} = winston.format;

// Custom log format for development
const devFormat = combine(
  colorize(),
  timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
  printf(({level, message, timestamp, ...meta}) => {
    // Remove internal winston symbols from meta
    const {[Symbol.for('splat')]: splat, ...rest} = meta;
    const metaString = Object.keys(rest).length ? JSON.stringify(rest) : '';
    return `${timestamp} [${level}]: ${message} ${metaString}`;
  }),
);

// Production format (no color, file-friendly)
const prodFormat = combine(
  timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
  printf(({level, message, timestamp, ...meta}) => {
    const metaString = Object.keys(meta).length ? JSON.stringify(meta) : '';
    return `${timestamp} [${level}]: ${message} ${metaString}`;
  }),
);

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
  transports: [
    new winston.transports.Console(),
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

export const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

export default logger;
