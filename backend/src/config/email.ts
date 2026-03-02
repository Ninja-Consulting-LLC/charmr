import {EmailConfig} from '../types/email';

export const emailConfig: EmailConfig = {
  host: process.env.SMTP_HOST || 'mailhog',
  port: parseInt(process.env.SMTP_PORT || '1025', 10),
  secure: process.env.SMTP_SECURE === 'true',
  defaultFrom: process.env.SMTP_FROM || 'noreply@charmr.app',
  defaultReplyTo:
    process.env.SMTP_REPLY_TO ||
    process.env.SMTP_FROM ||
    'support@charmr.app',
};
