import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {Request, Response} from 'express';
import {
  createSupportTicket,
  getSupportTickets,
} from '../controllers/supportController';
import {Database} from '../db/types';

const mockRes = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as unknown as Response;
};

describe('supportController', () => {
  const createTicket = jest.fn() as jest.MockedFunction<any>;
  const getTicketsByUserId = jest.fn() as jest.MockedFunction<any>;
  const updateTicketStatus = jest.fn() as jest.MockedFunction<any>;
  let db: Database;

  beforeEach(() => {
    jest.clearAllMocks();
    db = {
      support: {
        createTicket,
        getTicketsByUserId,
        updateTicketStatus,
      },
    } as unknown as Database;
  });

  describe('createSupportTicket', () => {
    it('returns 400 when userId or message missing', async () => {
      const req = {body: {userId: '', message: ''}} as Request;
      const res = mockRes();
      await createSupportTicket(req, res, db);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('creates ticket with subject from email when subject omitted', async () => {
      createTicket.mockResolvedValue({
        id: 't1',
        userId: 'u1',
        subject: 'App contact (a@b.com)',
        message: 'hi',
      });
      const req = {
        body: {
          userId: 'u1',
          message: 'hi',
          email: '  a@b.com  ',
        },
      } as Request;
      const res = mockRes();
      await createSupportTicket(req, res, db);
      expect(createTicket).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'App contact (a@b.com)',
        }),
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('uses explicit subject when provided', async () => {
      createTicket.mockResolvedValue({id: 't2'});
      const req = {
        body: {
          userId: 'u1',
          message: 'm',
          subject: '  Custom  ',
        },
      } as Request;
      const res = mockRes();
      await createSupportTicket(req, res, db);
      expect(createTicket).toHaveBeenCalledWith(
        expect.objectContaining({subject: 'Custom'}),
      );
    });

    it('returns 500 when createTicket throws', async () => {
      createTicket.mockRejectedValue(new Error('db down'));
      const req = {body: {userId: 'u1', message: 'm'}} as Request;
      const res = mockRes();
      await createSupportTicket(req, res, db);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getSupportTickets', () => {
    it('returns tickets for user', async () => {
      getTicketsByUserId.mockResolvedValue([]);
      const req = {params: {userId: 'u1'}} as unknown as Request;
      const res = mockRes();
      await getSupportTickets(req, res, db);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it('returns 500 when getTicketsByUserId throws', async () => {
      getTicketsByUserId.mockRejectedValue(new Error('fail'));
      const req = {params: {userId: 'u1'}} as unknown as Request;
      const res = mockRes();
      await getSupportTickets(req, res, db);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
