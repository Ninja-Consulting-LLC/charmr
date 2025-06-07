export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  defaultFrom: string;
}

export interface SupportRequest {
  userId: string;
  email: string;
  message: string;
  plan: string;
  dailyMessagesUsed: number;
  dailyMessageLimit: number;
  extraMessages: number;
  name?: string;
}

export interface EmailService {
  sendEmail: (
    to: string,
    subject: string,
    text: string,
    html?: string,
  ) => Promise<void>;
}

export interface SupportEmailService {
  sendSupportRequest: (request: SupportRequest) => Promise<void>;
}
