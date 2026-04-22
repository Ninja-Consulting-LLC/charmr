import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import {Request, Response} from 'express';
import {
  createUser,
  deleteUser,
  getMessageCosts,
  getUser,
  getUserByInstallationId,
  getUserInfo,
  getUserMessageHistory,
  getUserMessages,
  getUsers,
  linkAnonymousUser,
  resetDb,
  resetSqliteDb,
  resetUserMessageLimit,
  testContext,
  updateUser,
  updateUserPlan,
} from '../controllers/adminController';
import {getDatabase} from '../db';
import {MessageMode, MessageRole, MessageType, SubscriptionTier} from '../types/enums';

const mockRes = (): Response =>
  ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
  }) as unknown as Response;

describe('adminController HTTP-shaped handlers', () => {
  let db: Awaited<ReturnType<typeof getDatabase>>;
  const savedResetAllow = process.env.CHARMR_RESET_DB_ALLOWLIST;

  beforeEach(async () => {
    process.env.CHARMR_RESET_DB_ALLOWLIST = 'mike.doubintchik@gmail.com';
    db = await getDatabase();
    await db.clearDatabase();
    await db.createUser({
      id: 'adm-u1',
      email: 'a@a.com',
      name: 'A',
      plan: SubscriptionTier.FREE,
    });
  });

  afterAll(() => {
    if (savedResetAllow === undefined) {
      delete process.env.CHARMR_RESET_DB_ALLOWLIST;
    } else {
      process.env.CHARMR_RESET_DB_ALLOWLIST = savedResetAllow;
    }
  });

  it('getUsers returns rows', async () => {
    const res = mockRes();
    await getUsers({} as Request, res, db);
    expect(res.json).toHaveBeenCalled();
    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(Array.isArray(body)).toBe(true);
  });

  it('getUserMessages 404 when user missing', async () => {
    const res = mockRes();
    await getUserMessages(
      {params: {userId: 'nope'}} as unknown as Request,
      res,
      db,
    );
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('getUserMessages returns messages for user', async () => {
    const res = mockRes();
    await getUserMessages(
      {params: {userId: 'adm-u1'}} as unknown as Request,
      res,
      db,
    );
    expect(res.json).toHaveBeenCalled();
  });

  it('resetUserMessageLimit updates user', async () => {
    const res = mockRes();
    await resetUserMessageLimit(
      {params: {userId: 'adm-u1'}} as unknown as Request,
      res,
      db,
    );
    expect(res.json).toHaveBeenCalled();
  });

  it('resetUserMessageLimit 404 when user missing', async () => {
    const res = mockRes();
    await resetUserMessageLimit(
      {params: {userId: 'missing'}} as unknown as Request,
      res,
      db,
    );
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('createUser persists and returns null on duplicate id', async () => {
    const ok = await createUser(db, {
      id: 'fresh-u',
      email: 'fresh@x.com',
      name: 'Fresh',
    });
    expect(ok).not.toBeNull();
    const dup = await createUser(db, {
      id: 'fresh-u',
      email: 'other@x.com',
      name: 'O',
    });
    expect(dup).toBeNull();
  });

  it('getUserByInstallationId 404 and success', async () => {
    const res404 = mockRes();
    await getUserByInstallationId(
      {params: {installationId: 'no-such'}} as unknown as Request,
      res404,
      db,
    );
    expect(res404.status).toHaveBeenCalledWith(404);

    await db.createUser({
      id: 'by-inst',
      email: 'by@x.com',
      name: 'By',
      installationId: 'inst-xyz',
    });
    const res = mockRes();
    await getUserByInstallationId(
      {params: {installationId: 'inst-xyz'}} as unknown as Request,
      res,
      db,
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalled();
  });

  it('linkAnonymousUser validates body and links sqlite users', async () => {
    const bad = mockRes();
    await linkAnonymousUser(
      {body: {anonymousUserId: 'a'}} as unknown as Request,
      bad,
      db,
    );
    expect(bad.status).toHaveBeenCalledWith(400);

    const noAnon = mockRes();
    await linkAnonymousUser(
      {
        body: {anonymousUserId: 'nope', registeredUserId: 'adm-u1'},
      } as unknown as Request,
      noAnon,
      db,
    );
    expect(noAnon.status).toHaveBeenCalledWith(404);

    await db.createUser({
      id: 'anon-x',
      email: 'anon@x.com',
      name: 'Anon',
      plan: SubscriptionTier.FREE,
    });
    await db.updateUser('anon-x', {extraMessages: 2});

    const noReg = mockRes();
    await linkAnonymousUser(
      {
        body: {anonymousUserId: 'anon-x', registeredUserId: 'nope-reg'},
      } as unknown as Request,
      noReg,
      db,
    );
    expect(noReg.status).toHaveBeenCalledWith(404);

    const ok = mockRes();
    await linkAnonymousUser(
      {
        body: {
          anonymousUserId: 'anon-x',
          registeredUserId: 'adm-u1',
          installationId: 'new-inst',
        },
      } as unknown as Request,
      ok,
      db,
    );
    expect(ok.json).toHaveBeenCalled();
  });

  it('updateUserPlan validates plan', async () => {
    const res = mockRes();
    await updateUserPlan(
      {params: {userId: 'adm-u1'}, body: {}} as unknown as Request,
      res,
      db,
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('updateUserPlan updates', async () => {
    const res = mockRes();
    await updateUserPlan(
      {
        params: {userId: 'adm-u1'},
        body: {plan: SubscriptionTier.PRO},
      } as unknown as Request,
      res,
      db,
    );
    expect(res.json).toHaveBeenCalled();
  });

  it('getUser 404', async () => {
    const res = mockRes();
    await getUser({params: {userId: 'x'}} as unknown as Request, res, db);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('getUser returns user', async () => {
    const res = mockRes();
    await getUser(
      {params: {userId: 'adm-u1'}} as unknown as Request,
      res,
      db,
    );
    expect(res.json).toHaveBeenCalled();
  });

  it('getUserMessageHistory 404', async () => {
    const res = mockRes();
    await getUserMessageHistory(
      {params: {userId: 'n'}, query: {}} as unknown as Request,
      res,
      db,
    );
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('getUserMessageHistory returns structure', async () => {
    const res = mockRes();
    await getUserMessageHistory(
      {params: {userId: 'adm-u1'}, query: {}} as unknown as Request,
      res,
      db,
    );
    expect(res.json).toHaveBeenCalled();
  });

  it('getUserMessageHistory respects date filters', async () => {
    const now = new Date().toISOString();
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    await db.saveMessage('adm-u1', 'm1', {
      role: MessageRole.USER,
      type: MessageType.TEXT,
      mode: MessageMode.GENERATE,
      content: 'hi',
      timestamp: now,
    });
    const res = mockRes();
    await getUserMessageHistory(
      {
        params: {userId: 'adm-u1'},
        query: {startDate: yesterday, endDate: now},
      } as unknown as Request,
      res,
      db,
    );
    expect(res.json).toHaveBeenCalled();
    const body = (res.json as jest.Mock).mock.calls[0][0] as {
      messages: unknown[];
    };
    expect(body.messages.length).toBeGreaterThanOrEqual(1);
  });

  it('getMessageCosts 404', async () => {
    const res = mockRes();
    await getMessageCosts(
      {params: {userId: 'n'}, query: {}} as unknown as Request,
      res,
      db,
    );
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('getMessageCosts returns for user', async () => {
    const res = mockRes();
    await getMessageCosts(
      {params: {userId: 'adm-u1'}, query: {}} as unknown as Request,
      res,
      db,
    );
    expect(res.json).toHaveBeenCalled();
  });

  it('getMessageCosts accepts optional date range', async () => {
    const res = mockRes();
    await getMessageCosts(
      {
        params: {userId: 'adm-u1'},
        query: {startDate: '2020-01-01', endDate: '2030-01-01'},
      } as unknown as Request,
      res,
      db,
    );
    expect(res.json).toHaveBeenCalled();
  });

  it('getUserInfo 404 and returns payload', async () => {
    const res404 = mockRes();
    await getUserInfo(
      {params: {userId: 'nope'}, query: {}} as unknown as Request,
      res404,
      db,
    );
    expect(res404.status).toHaveBeenCalledWith(404);

    await db.saveMessage('adm-u1', 'mx', {
      role: MessageRole.USER,
      type: MessageType.TEXT,
      mode: MessageMode.GENERATE,
      content: 'x',
      timestamp: new Date().toISOString(),
    });
    const res = mockRes();
    await getUserInfo(
      {params: {userId: 'adm-u1'}, query: {}} as unknown as Request,
      res,
      db,
    );
    expect(res.json).toHaveBeenCalled();
    const body = (res.json as jest.Mock).mock.calls[0][0] as {
      user: {id: string};
      messages: unknown[];
    };
    expect(body.user.id).toBe('adm-u1');
    expect(Array.isArray(body.messages)).toBe(true);
  });

  it('updateUser validates body', async () => {
    const res = mockRes();
    await updateUser(
      {params: {userId: 'adm-u1'}, body: {}} as unknown as Request,
      res,
      db,
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('updateUser applies changes', async () => {
    const res = mockRes();
    await updateUser(
      {
        params: {userId: 'adm-u1'},
        body: {name: 'New'},
      } as unknown as Request,
      res,
      db,
    );
    expect(res.json).toHaveBeenCalled();
  });

  it('deleteUser removes user', async () => {
    const res = mockRes();
    await deleteUser(
      {params: {userId: 'adm-u1'}} as unknown as Request,
      res,
      db,
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('resetSqliteDb clears sqlite', async () => {
    const res = mockRes();
    await resetSqliteDb({} as Request, res, db);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('resetDb rejects unauthorized email', async () => {
    const res = mockRes();
    await resetDb(
      {user: {email: 'not-admin@x.com'}} as Parameters<typeof resetDb>[0],
      res,
      db,
    );
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('resetDb clears sqlite usage for authorized email', async () => {
    const res = mockRes();
    await resetDb(
      {
        user: {email: 'mike.doubintchik@gmail.com'},
      } as Parameters<typeof resetDb>[0],
      res,
      db,
    );
    expect(res.json).toHaveBeenCalledWith({
      message: 'Database reset successfully',
    });
  });

  it('testContext seeds conversation', async () => {
    const res = mockRes();
    await testContext({} as Request, res, db);
    expect(res.status).toHaveBeenCalledWith(200);
    const body = (res.json as jest.Mock).mock.calls[0][0] as {
      userId: string;
      messageCount: number;
    };
    expect(body.userId).toBe('test-context-user');
    expect(body.messageCount).toBeGreaterThan(0);
  });
});
