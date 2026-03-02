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
    process.env.SMTP_FROM = 'support@example.invalid';
    process.env.SMTP_REPLY_TO = 'replyto@example.invalid';

    const {config} = await import('../config/config');

    expect(config.email.host).toBe('email-smtp.us-east-1.amazonaws.com');
    expect(config.email.port).toBe(587);
    expect(config.email.secure).toBe(false);
    expect(config.email.auth).toEqual({
      user: 'smtp-user',
      pass: 'smtp-pass',
    });
    expect(config.email.defaultFrom).toBe('support@example.invalid');
    expect(config.email.defaultReplyTo).toBe('replyto@example.invalid');
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
    expect(config.email.defaultFrom).toBe('noreply@example.invalid');
    expect(config.email.defaultReplyTo).toBe('support@example.invalid');
  });
});
