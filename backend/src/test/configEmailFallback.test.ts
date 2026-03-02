import {afterAll, beforeEach, describe, expect, it, jest} from '@jest/globals';

describe('config email fallback resolution', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {...originalEnv};
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('uses SMTP_* values when EMAIL_* values are missing', async () => {
    process.env.NODE_ENV = 'development';
    process.env.EMAIL_HOST = '';
    process.env.EMAIL_PORT = '';
    process.env.EMAIL_SECURE = '';
    process.env.EMAIL_USER = '';
    process.env.EMAIL_PASS = '';
    process.env.EMAIL_DEFAULT_FROM = '';
    process.env.EMAIL_DEFAULT_REPLY_TO = '';

    process.env.SMTP_HOST = 'email-smtp.us-east-1.amazonaws.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_SECURE = 'false';
    process.env.SMTP_USER = 'smtp-user';
    process.env.SMTP_PASS = 'smtp-pass';
    process.env.SMTP_FROM = 'support@charmrapp.com';

    const {config} = await import('../config/config');

    expect(config.email.host).toBe('email-smtp.us-east-1.amazonaws.com');
    expect(config.email.port).toBe(587);
    expect(config.email.secure).toBe(false);
    expect(config.email.auth).toEqual({
      user: 'smtp-user',
      pass: 'smtp-pass',
    });
    expect(config.email.defaultFrom).toBe('support@charmrapp.com');
    expect(config.email.defaultReplyTo).toBe('support@charmrapp.com');
  });

  it('prefers SMTP_* values over EMAIL_* values when both are set', async () => {
    process.env.NODE_ENV = 'development';
    process.env.EMAIL_HOST = 'smtp.internal.local';
    process.env.EMAIL_PORT = '2525';
    process.env.EMAIL_SECURE = 'true';
    process.env.EMAIL_USER = 'email-user';
    process.env.EMAIL_PASS = 'email-pass';
    process.env.EMAIL_DEFAULT_FROM = 'noreply@charmr.app';
    process.env.EMAIL_DEFAULT_REPLY_TO = 'support@charmr.app';

    process.env.SMTP_HOST = 'email-smtp.us-east-1.amazonaws.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_SECURE = 'false';
    process.env.SMTP_USER = 'smtp-user';
    process.env.SMTP_PASS = 'smtp-pass';
    process.env.SMTP_FROM = 'support@charmrapp.com';

    const {config} = await import('../config/config');

    expect(config.email.host).toBe('email-smtp.us-east-1.amazonaws.com');
    expect(config.email.port).toBe(587);
    expect(config.email.secure).toBe(true);
    expect(config.email.auth).toEqual({
      user: 'smtp-user',
      pass: 'smtp-pass',
    });
    expect(config.email.defaultFrom).toBe('support@charmrapp.com');
    expect(config.email.defaultReplyTo).toBe('support@charmr.app');
  });

  it('falls back to EMAIL_* values when SMTP_* values are missing', async () => {
    process.env.NODE_ENV = 'development';
    process.env.EMAIL_HOST = 'smtp.internal.local';
    process.env.EMAIL_PORT = '2525';
    process.env.EMAIL_SECURE = 'true';
    process.env.EMAIL_USER = 'email-user';
    process.env.EMAIL_PASS = 'email-pass';
    process.env.EMAIL_DEFAULT_FROM = 'noreply@charmr.app';
    process.env.EMAIL_DEFAULT_REPLY_TO = 'support@charmr.app';

    process.env.SMTP_HOST = '';
    process.env.SMTP_PORT = '';
    process.env.SMTP_SECURE = '';
    process.env.SMTP_USER = '';
    process.env.SMTP_PASS = '';
    process.env.SMTP_FROM = '';

    const {config} = await import('../config/config');

    expect(config.email.host).toBe('smtp.internal.local');
    expect(config.email.port).toBe(2525);
    expect(config.email.secure).toBe(true);
    expect(config.email.auth).toEqual({
      user: 'email-user',
      pass: 'email-pass',
    });
    expect(config.email.defaultFrom).toBe('noreply@charmr.app');
    expect(config.email.defaultReplyTo).toBe('support@charmr.app');
  });
});
