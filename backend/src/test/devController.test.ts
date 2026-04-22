import {describe, expect, it, jest} from '@jest/globals';
import {Request} from 'express';
import {
  checkSchemaHealth,
  getMatchSummary,
  updateMatchSummary,
} from '../controllers/devController';
import {Database} from '../db/types';

const mockRes = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as any;
};

describe('devController', () => {
  it('checkSchemaHealth returns stats for empty messages', async () => {
    const getMessages = jest.fn() as jest.MockedFunction<any>;
    getMessages.mockResolvedValue({messages: []});
    const db = {getMessages} as unknown as Database;
    const res = mockRes();
    await checkSchemaHealth({} as Request, res, db);
    expect(res.json).toHaveBeenCalledWith({
      issues: [],
      stats: expect.objectContaining({totalMessages: 0}),
    });
  });

  it('checkSchemaHealth reports schema issues', async () => {
    const t0 = '2020-01-02T00:00:00.000Z';
    const t1 = '2020-01-01T00:00:00.000Z';
    const messages = [
      {
        id: 1,
        type: 'text',
        used: true,
        matchId: '',
        timestamp: t0,
        replyTo: null,
      },
      {
        id: 2,
        type: 'summary',
        used: false,
        matchId: 'm1',
        timestamp: t1,
        replyTo: 99,
      },
      {
        id: 3,
        type: 'text',
        used: false,
        matchId: 'm1',
        timestamp: t0,
        replyTo: 1,
      },
    ];
    const getMessages = jest.fn() as jest.MockedFunction<any>;
    getMessages.mockResolvedValue({messages});
    const db = {getMessages} as unknown as Database;
    const res = mockRes();
    await checkSchemaHealth({} as Request, res, db);
    const payload = res.json.mock.calls[0][0];
    expect(payload.issues.length).toBeGreaterThan(0);
    expect(payload.stats.totalMessages).toBe(3);
  });

  it('checkSchemaHealth returns 500 on failure', async () => {
    const getMessages = jest.fn() as jest.MockedFunction<any>;
    getMessages.mockRejectedValue(new Error('db'));
    const db = {getMessages} as unknown as Database;
    const res = mockRes();
    await checkSchemaHealth({} as Request, res, db);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('getMatchSummary returns summary json', async () => {
    const getMatchById = jest.fn() as jest.MockedFunction<any>;
    getMatchById.mockResolvedValue({summary: 's1'});
    const db = {getMatchById} as unknown as Database;
    const res = mockRes();
    await getMatchSummary(
      {params: {userId: 'u', matchId: 'm'}} as any,
      res,
      db,
    );
    expect(res.json).toHaveBeenCalledWith({summary: 's1'});
  });

  it('getMatchSummary returns undefined summary when match load fails', async () => {
    const getMatchById = jest.fn() as jest.MockedFunction<any>;
    getMatchById.mockRejectedValue(new Error('x'));
    const db = {getMatchById} as unknown as Database;
    const res = mockRes();
    await getMatchSummary(
      {params: {userId: 'u', matchId: 'm'}} as any,
      res,
      db,
    );
    expect(res.json).toHaveBeenCalledWith({summary: undefined});
  });

  it('updateMatchSummary requires summary body field', async () => {
    const db = {} as Database;
    const res = mockRes();
    await updateMatchSummary(
      {params: {userId: 'u', matchId: 'm'}, body: {}} as any,
      res,
      db,
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('updateMatchSummary updates match', async () => {
    const updateMatch = jest.fn() as jest.MockedFunction<any>;
    updateMatch.mockResolvedValue(undefined);
    const db = {updateMatch} as unknown as Database;
    const res = mockRes();
    await updateMatchSummary(
      {
        params: {userId: 'u', matchId: 'm'},
        body: {summary: 'new'},
      } as any,
      res,
      db,
    );
    expect(updateMatch).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({success: true});
  });
});
