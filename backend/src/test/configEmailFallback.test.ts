import {afterAll, beforeEach, describe, expect, it, jest} from '@jest/globals';

describe('config SMTP resolution', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {...originalEnv};
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('uses SMTP_* values for email configuration', async () => {
    process.env.NODE_ENV = 'development';
    process.env.SMTP_HOST = 'email-smtp.us-east-1.amazonaws.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_SECURE = 'false';
    process.env.SMTP_USER = 'smtp-user';
    process.env.SMTP_PASS = 'smtp-pass';
    process.env.SMTP_FROM = 'support@charmrapp.com';
    process.env.SMTP_REPLY_TO = 'replyto@charmrapp.com';

    const {config} = await import('../config/config');

    expect(config.email.host).toBe('email-smtp.us-east-1.amazonaws.com');
    expect(config.email.port).toBe(587);
    expect(config.email.secure).toBe(false);
    expect(config.email.auth).toEqual({
      user: 'smtp-user',
      pass: 'smtp-pass',
    });
    expect(config.email.defaultFrom).toBe('support@charmrapp.com');
    expect(config.email.defaultReplyTo).toBe('replyto@charmrapp.com');
  });

  it('uses defaults when SMTP_* values are missing', async () => {
    process.env.NODE_ENV = 'development';
    process.env.SMTP_HOST = '';
    process.env.SMTP_PORT = '';
    process.env.SMTP_SECURE = '';
    process.env.SMTP_USER = '';
    process.env.SMTP_PASS = '';
    process.env.SMTP_FROM = '';
    process.env.SMTP_REPLY_TO = '';

    const {config} = await import('../config/config');

    expect(config.email.host).toBe('mailhog');
    expect(config.email.port).toBe(1025);
    expect(config.email.secure).toBe(false);
    expect(config.email.auth).toBeUndefined();
    expect(config.email.defaultFrom).toBe('noreply@charmr.app');
    expect(config.email.defaultReplyTo).toBe('support@charmr.app');
  });

  it('ignores EMAIL_* legacy variables when SMTP_* is absent', async () => {
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
    process.env.SMTP_REPLY_TO = '';

    const {config} = await import('../config/config');

    expect(config.email.host).toBe('mailhog');
    expect(config.email.port).toBe(1025);
    expect(config.email.secure).toBe(false);
    expect(config.email.auth).toBeUndefined();
    expect(config.email.defaultFrom).toBe('noreply@charmr.app');
    expect(config.email.defaultReplyTo).toBe('support@charmr.app');
  });
});
