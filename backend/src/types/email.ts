// Base email configuration
export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth?: {
    user: string;
    pass: string;
  };
  defaultFrom: string;
  defaultReplyTo?: string;
}

// Email service interface
export interface EmailService {
  sendEmail(options: EmailOptions): Promise<void>;
}

// Email options for sending
export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  replyTo?: string;
}

// Support request data
export interface SupportRequest {
  userId: string;
  email: string;
  phone?: string;
  message: string;
  plan: string;
  dailyMessagesUsed: number;
  dailyMessageLimit: number;
  extraMessages: number;
  name?: string;
}
