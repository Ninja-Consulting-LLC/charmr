type LoggerType = {
  debug: (message: string, data?: any) => void;
  info: (message: string, data?: any) => void;
  warn: (message: string, data?: any) => void;
  error: (message: string, data?: any) => void;
};

const createLogger = (
  category: string,
  settings: {debug: boolean; info: boolean; warn: boolean; error: boolean},
): LoggerType => {
  const format = (level: string, message: string, data?: any) => {
    const prefix = `[${level}] [${category}]`;
    if (typeof data === 'undefined') {
      return [prefix, message] as const;
    }
    return [prefix, message, data] as const;
  };

  return {
    debug: settings.debug
      ? (message, data) => console.debug(...format('debug', message, data))
      : () => {},
    info: settings.info
      ? (message, data) => console.info(...format('info', message, data))
      : () => {},
    warn: settings.warn
      ? (message, data) => console.warn(...format('warn', message, data))
      : () => {},
    error: settings.error
      ? (message, data) => console.error(...format('error', message, data))
      : () => {},
  };
};

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
