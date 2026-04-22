describe('config', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.doMock('react-native-config', () => ({
      __esModule: true,
      default: {
        API_BASE_URL: 'https://unit.test.api',
        LOCAL_IP: '192.168.1.10',
        NODE_ENV: 'test',
        CHAT_PAGE_SIZE: '42',
        REVENUECAT_IOS_API_KEY: 'ios-k',
        REVENUECAT_ANDROID_API_KEY: 'and-k',
      },
    }));
    jest.doMock('../../utils/logger', () => ({
      logger: {
        app: {debug: jest.fn(), error: jest.fn(), info: jest.fn()},
        config: {debug: jest.fn(), info: jest.fn()},
        match: {debug: jest.fn(), error: jest.fn()},
      },
    }));
  });

  it('exposes apiBaseUrl and chat.pageSize from env', () => {
    const {config} = require('../config') as typeof import('../config');
    expect(config.apiBaseUrl).toBe('https://unit.test.api');
    expect(config.chat.pageSize).toBe(42);
  });
});
