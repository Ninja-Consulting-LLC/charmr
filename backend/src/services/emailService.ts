import nodemailer from 'nodemailer';
import logger from '../utils/logger';

// Configure nodemailer with environment variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendEmail = async (
  to: string,
  subject: string,
  html: string,
): Promise<void> => {
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject,
      html,
    });

    logger.info('Email sent successfully', {
      to,
      subject,
      messageId: info.messageId,
    });
  } catch (error) {
    logger.error('Failed to send email', {
      to,
      subject,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error('Failed to send email');
  }
};

export const sendTicketCreationEmail = async (
  userEmail: string,
  ticketSubject: string,
  ticketId: string,
): Promise<void> => {
  const subject = 'Support Ticket Created';
  const html = `
    <h1>Your Support Ticket Has Been Created</h1>
    <p>Thank you for contacting our support team. Your ticket has been received and will be reviewed shortly.</p>
    <p><strong>Ticket Details:</strong></p>
    <ul>
      <li>Ticket ID: ${ticketId}</li>
      <li>Subject: ${ticketSubject}</li>
    </ul>
    <p>We will notify you of any updates to your ticket.</p>
  `;

  logger.info('Sending ticket creation email', {
    userEmail,
    ticketId,
    subject: ticketSubject,
  });

  await sendEmail(userEmail, subject, html);
};

export const sendTicketUpdateEmail = async (
  userEmail: string,
  ticketSubject: string,
  ticketId: string,
  status: string,
): Promise<void> => {
  const subject = 'Support Ticket Updated';
  const html = `
    <h1>Your Support Ticket Has Been Updated</h1>
    <p>There has been an update to your support ticket.</p>
    <p><strong>Ticket Details:</strong></p>
    <ul>
      <li>Ticket ID: ${ticketId}</li>
      <li>Subject: ${ticketSubject}</li>
      <li>New Status: ${status}</li>
    </ul>
    <p>You can check your ticket for more details.</p>
  `;

  logger.info('Sending ticket update email', {
    userEmail,
    ticketId,
    subject: ticketSubject,
    status,
  });

  await sendEmail(userEmail, subject, html);
};

export const sendTicketCommentEmail = async (
  userEmail: string,
  ticketSubject: string,
  ticketId: string,
  commenterName: string,
): Promise<void> => {
  const subject = 'New Comment on Your Support Ticket';
  const html = `
    <h1>New Comment Added to Your Support Ticket</h1>
    <p>${commenterName} has added a comment to your support ticket.</p>
    <p><strong>Ticket Details:</strong></p>
    <ul>
      <li>Ticket ID: ${ticketId}</li>
      <li>Subject: ${ticketSubject}</li>
    </ul>
    <p>You can check your ticket to view the comment.</p>
  `;

  logger.info('Sending ticket comment email', {
    userEmail,
    ticketId,
    subject: ticketSubject,
    commenterName,
  });

  await sendEmail(userEmail, subject, html);
};
