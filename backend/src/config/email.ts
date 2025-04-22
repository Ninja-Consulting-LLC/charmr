import {EmailConfig} from '../types/email';

export const emailConfig: EmailConfig = {
  host: process.env.EMAIL_HOST || 'mailhog',
  port: parseInt(process.env.EMAIL_PORT || '1025', 10),
  secure: process.env.EMAIL_SECURE === 'true',
  defaultFrom: process.env.EMAIL_DEFAULT_FROM || 'noreply@example.invalid',
  defaultReplyTo: process.env.EMAIL_DEFAULT_REPLY_TO || 'support@example.invalid',
};
