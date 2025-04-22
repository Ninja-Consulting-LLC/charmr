import nodemailer from 'nodemailer';
import {
  EmailConfig,
  EmailOptions,
  EmailService,
  SupportRequest,
} from '../../types/email';

// Create email service instance
export const createEmailService = (config: EmailConfig): EmailService => {
  console.log(
    `[${new Date().toISOString()}] [Email] Creating email service with config:`,
    {
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth ? 'configured' : 'none',
    },
  );

  const transporterConfig = {
    host: config.host,
    port: config.port,
    secure: config.secure,
    ...(config.auth && {auth: config.auth}),
  };

  const transporter = nodemailer.createTransport(transporterConfig);

  // Verify transporter configuration
  transporter.verify((error, success) => {
    if (error) {
      console.error(
        `[${new Date().toISOString()}] [Email] Transporter verification failed:`,
        error,
      );
    } else {
      console.log(
        `[${new Date().toISOString()}] [Email] Transporter verified successfully`,
      );
    }
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
        const info = await transporter.sendMail(mailOptions);
        console.log(
          `[${new Date().toISOString()}] [Email] Email sent successfully:`,
          {
            messageId: info.messageId,
            to: options.to,
          },
        );
      } catch (error) {
        console.error(
          `[${new Date().toISOString()}] [Email] Error sending email:`,
          error,
        );
        throw error;
      }
    },
  };
};

// Support email service
export const createSupportEmailService = (
  emailService: EmailService,
  supportEmail: string,
) => {
  return {
    sendSupportRequest: async (request: SupportRequest) => {
      const subject = 'Support Request from Charmr App';
      const text = `
User Information:
- User ID: ${request.userId}
- Email: ${request.email}
- Phone: ${request.phone || 'Not provided'}
- Current Plan: ${request.plan}
- Daily Messages Used: ${request.dailyMessagesUsed}/${request.dailyMessageLimit}
- Extra Messages: ${request.extraMessages}

Message:
${request.message}
      `.trim();

      try {
        await emailService.sendEmail({
          to: supportEmail,
          subject,
          text,
          replyTo: request.email,
        });
        console.log(
          `[${new Date().toISOString()}] [Support] Support request email sent successfully`,
        );
      } catch (error) {
        console.error(
          `[${new Date().toISOString()}] [Support] Error sending support request email:`,
          error,
        );
        throw error;
      }
    },
  };
};
