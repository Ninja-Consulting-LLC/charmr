import nodemailer from 'nodemailer';
import {
  EmailConfig,
  EmailOptions,
  EmailService,
  SupportRequest,
} from '../../types/email';
import logger from '../../utils/logger';

// Create email service instance
export const createEmailService = (config: EmailConfig): EmailService => {
  logger.debug('Creating email service', {
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth ? 'configured' : 'none',
  });

  const transporterConfig = {
    host: config.host,
    port: config.port,
    secure: config.secure,
    ...(config.auth && {auth: config.auth}),
  };

  logger.debug('Email transporter configuration', {
    host: transporterConfig.host,
    port: transporterConfig.port,
    secure: transporterConfig.secure,
    hasAuth: !!transporterConfig.auth,
  });

  const transporter = nodemailer.createTransport(transporterConfig);

  // Verify transporter configuration
  transporter.verify(error => {
    if (error) {
      logger.error('Failed to verify email transporter', {
        error: error.message,
        stack: error.stack,
      });
    } else {
      logger.debug('Email transporter verified successfully');
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
        logger.info('Email sent successfully', {
          to: options.to,
          subject: options.subject,
          messageId: info.messageId,
        });
      } catch (error) {
        logger.error('Failed to send email', {
          to: options.to,
          subject: options.subject,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
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
        logger.info('Support request email sent successfully');

        // Send confirmation email to the user
        await emailService.sendEmail({
          to: request.email,
          subject: 'Charmr Support: We received your message',
          text: `${
            request.name ? `Hi ${request.name},` : 'Hi there,'
          }\n\nWe have received your support request and will get back to you as soon as possible.\n\nThank you for reaching out to Charmr Support!`,
        });
        logger.info(
          `Support request confirmation email sent to user ${request.email}`,
        );
      } catch (error) {
        logger.error('Failed to send support request email', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    },
  };
};
