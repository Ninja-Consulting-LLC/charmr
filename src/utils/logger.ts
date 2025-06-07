import {logger as RNLogger} from 'react-native-logs';

const COLORS = {
  DEBUG: '\x1b[34m', // blue
  INFO: '\x1b[32m', // green
  WARN: '\x1b[33m', // yellow
  ERROR: '\x1b[31m', // red
  LOG: '\x1b[0m', // reset
  RESET: '\x1b[0m',
};

type ColorKey = keyof typeof COLORS;

const customTransport = (props: any) => {
  const {level, msg, extension, data} = props;
  const timestamp = new Date().toLocaleTimeString();
  const ext = extension ? `[${extension}]` : '';
  const levelStr = typeof level === 'string' ? level.toUpperCase() : 'LOG';
  const prefix = `${timestamp} ${levelStr} ${ext}`;

  // Capture stack and extract the caller file:line
  let caller = '';
  const stack = new Error().stack;
  if (stack) {
    const stackLines = stack.split('\n');
    // Try to match something like App.tsx:42:13
    const match = stackLines[3]?.match(/([\w-]+\.\w+):(\d+):(\d+)/);
    if (match) {
      caller = `${match[1]}:${match[2]}`;
    } else if (stackLines[3]) {
      caller = stackLines[3].trim();
    }
  }

  const color = (COLORS as Record<string, string>)[levelStr] || '';
  const reset = COLORS.RESET;

  if (data) {
    console.log(`${color}${prefix}: ${msg} (${caller})${reset}`, data);
  } else {
    console.log(`${color}${prefix}: ${msg} (${caller})${reset}`);
  }
};

const defaultConfig = {
  severity: __DEV__ ? 'debug' : 'info',
  transport: customTransport,
  transportOptions: {
    colors: {
      debug: 'blue',
      info: 'green',
      warn: 'yellow',
      error: 'red',
    },
  },
  enabled: true,
} as const;

const log = RNLogger.createLogger(defaultConfig);

type LoggerType = {
  debug: (message: string, data?: any) => void;
  info: (message: string, data?: any) => void;
  warn: (message: string, data?: any) => void;
  error: (message: string, data?: any) => void;
};

// Helper function to create a logger with specific settings
const createLogger = (
  category: string,
  settings: {debug: boolean; info: boolean; warn: boolean; error: boolean},
) => {
  const logger = log.extend(category) as LoggerType;
  return {
    debug: settings.debug ? logger.debug : () => {},
    info: settings.info ? logger.info : () => {},
    warn: settings.warn ? logger.warn : () => {},
    error: settings.error ? logger.error : () => {},
  };
};

// Create loggers for different parts of the app
export const logger = {
  app: createLogger('app', {
    debug: process.env.NODE_ENV === 'development',
    info: true,
    warn: true,
    error: true,
  }),
  auth: createLogger('auth', {
    debug: false,
    info: true,
    warn: true,
    error: true,
  }),
  match: createLogger('match', {
    debug: false,
    info: true,
    warn: true,
    error: true,
  }),
  deepLink: createLogger('deepLink', {
    debug: false,
    info: false,
    warn: true,
    error: true,
  }),
  config: createLogger('config', {
    debug: false,
    info: true,
    warn: true,
    error: true,
  }),
  revenueCat: createLogger('revenueCat', {
    debug: false,
    info: true,
    warn: true,
    error: true,
  }),
};
