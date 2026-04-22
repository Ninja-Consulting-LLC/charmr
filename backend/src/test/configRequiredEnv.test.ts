import {afterEach, describe, expect, it, jest} from '@jest/globals';

jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

describe('config/config required env in production', () => {
  const saved = {...process.env};

  afterEach(() => {
    process.env = {...saved};
    jest.resetModules();
  });

  it('throws when OPENAI_API_KEY is missing in production', async () => {
    jest.resetModules();
    process.env = {
      ...saved,
      NODE_ENV: 'production',
      GEMINI_API_KEY: 'gemini-key',
    };
    delete process.env.OPENAI_API_KEY;
    await expect(import('../config/config')).rejects.toThrow(
      'Missing required environment variable: OPENAI_API_KEY',
    );
  });

  it('throws when GEMINI_API_KEY is missing in production', async () => {
    jest.resetModules();
    process.env = {
      ...saved,
      NODE_ENV: 'production',
      OPENAI_API_KEY: 'openai-key',
    };
    delete process.env.GEMINI_API_KEY;
    await expect(import('../config/config')).rejects.toThrow(
      'Missing required environment variable: GEMINI_API_KEY',
    );
  });
});
