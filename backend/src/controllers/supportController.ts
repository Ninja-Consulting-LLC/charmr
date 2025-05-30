import {Request, Response} from 'express';
import {Database} from '../db/types';
import logger from '../utils/logger';

export const createSupportTicket = async (
  req: Request,
  res: Response,
  db: Database,
) => {
  try {
    const {userId, subject, message} = req.body;

    if (!userId || !subject || !message) {
      return res.status(400).json({
        error: 'Missing required fields',
      });
    }

    const ticket = await db.support.createTicket({
      userId,
      subject,
      message,
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    logger.info('Created support ticket', {
      ticketId: ticket.id,
      userId,
      subject,
    });

    return res.status(201).json(ticket);
  } catch (error) {
    logger.error('Failed to create support ticket:', error);
    return res.status(500).json({
      error: 'Failed to create support ticket',
    });
  }
};

export const getSupportTickets = async (
  req: Request,
  res: Response,
  db: Database,
) => {
  try {
    const {userId} = req.params;

    const tickets = await db.support.getTicketsByUserId(userId);

    return res.json(tickets);
  } catch (error) {
    logger.error('Failed to get support tickets:', error);
    return res.status(500).json({
      error: 'Failed to get support tickets',
    });
  }
};
