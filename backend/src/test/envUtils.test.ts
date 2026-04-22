import {afterEach, describe, expect, it, jest} from '@jest/globals';

describe('envUtils', () => {
  const original = {...process.env};

  afterEach(() => {
    process.env = {...original};
    jest.resetModules();
  });

  it('getEnvironmentInfo redacts secrets and returns snapshot', async () => {
    process.env.OPENAI_API_KEY = 'secret';
    process.env.GEMINI_API_KEY = 'gsecret';
    process.env.EMAIL_PASS = 'p';
    process.env.GOOGLE_APPLICATION_CREDENTIALS = '/path';
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON = '{}';
    jest.resetModules();
    const {getEnvironmentInfo} = await import('../utils/envUtils');
    const info = getEnvironmentInfo();
    expect(info.OPENAI_API_KEY).toBe('***');
    expect(info.GEMINI_API_KEY).toBe('***');
    expect(info.EMAIL_PASS).toBe('***');
    expect(info.GOOGLE_APPLICATION_CREDENTIALS).toBe('***');
    expect(info.GOOGLE_APPLICATION_CREDENTIALS_JSON).toBe('***');
  });

  it('getServiceConfig returns structured config', async () => {
    jest.resetModules();
    const {getServiceConfig} = await import('../utils/envUtils');
    const cfg = getServiceConfig();
    expect(cfg.openai).toEqual(
      expect.objectContaining({
        model: expect.any(String),
        maxTokens: expect.any(Number),
      }),
    );
    expect(cfg.rateLimit).toEqual(
      expect.objectContaining({
        windowMs: expect.any(Number),
        max: expect.any(Number),
      }),
    );
  });
});
