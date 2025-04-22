import nodemailer from 'nodemailer';
import {EmailConfig, EmailOptions} from '../../types/email';

export const createEmailService = (config: EmailConfig) => {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });

  return {
    sendEmail: async (options: EmailOptions) => {
      const mailOptions = {
        from: options.from || config.defaultFrom,
        replyTo: options.replyTo || config.defaultReplyTo,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      };

      try {
        await transporter.sendMail(mailOptions);
      } catch (error) {
        console.error('Error sending email:', error);
        throw error;
      }
    },
  };
};
