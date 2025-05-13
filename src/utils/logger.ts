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

// Create category-specific loggers
export const logger = {
  match: log.extend('match') as LoggerType,
  auth: log.extend('auth') as LoggerType,
  deepLink: log.extend('deepLink') as LoggerType,
  app: log.extend('app') as LoggerType,
  revenueCat: log.extend('revenueCat') as LoggerType,
  config: log.extend('config') as LoggerType,
} as const;
