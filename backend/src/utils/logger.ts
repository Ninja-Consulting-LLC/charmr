import winston from 'winston';

// Define custom colors for different log levels
winston.addColors({
  error: 'red',
  warning: 'yellow',
  info: 'green',
  http: 'magenta',
  verbose: 'cyan',
  debug: 'blue',
  silly: 'gray',
});

const {combine, timestamp, printf, colorize} = winston.format;

// Custom format function to ensure proper indentation
const customFormat = printf(({level, message, timestamp, ...meta}) => {
  const metaString = Object.keys(meta).length
    ? '\n' + JSON.stringify(meta, null, 2)
    : '';
  return `${timestamp} [${level}]: ${message}${metaString}`;
});

// Custom log format for development
const devFormat = combine(
  colorize({all: true}),
  timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
  customFormat,
);

// Production format (no color, file-friendly)
const prodFormat = combine(
  timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
  customFormat,
);

// Remove default console transport
winston.remove(winston.transports.Console);

const logger = winston.createLogger({
  level: process.env.LOGGER_DEBUG === 'true' ? 'debug' : 'info',
  levels: winston.config.syslog.levels, // Use syslog levels for better standardization
  format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
  defaultMeta: {app: 'charmr'},
  transports: [
    // Log errors and warnings to stderr
    new winston.transports.File({
      filename: '/dev/stderr',
      level: 'warning',
    }),
    // Log everything to stdout
    new winston.transports.File({
      filename: '/dev/stdout',
    }),
  ],
  // Handle uncaught exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: '/dev/stderr',
      level: 'error',
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: '/dev/stderr',
      level: 'error',
    }),
  ],
});

// Handle uncaught exceptions and rejections
process.on('uncaughtException', error => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', error => {
  logger.error('Unhandled Rejection:', error);
  process.exit(1);
});

export const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

export default logger;
