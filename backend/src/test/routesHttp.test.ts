import {afterAll, beforeAll, beforeEach, describe, expect, it, jest} from '@jest/globals';
import express from 'express';
import http from 'http';
import {AddressInfo} from 'net';
import {getDatabase} from '../db';
import createDevRouter from '../routes/devRoutes';
import createSupportTicketsRouter from '../routes/supportRoutes';
import createMatchRouter from '../routes/matchRoutes';
import createPushNotificationRouter from '../routes/pushNotificationRoutes';
import {SubscriptionTier} from '../types/enums';

jest.mock('../services/pushNotificationService', () => ({
  sendPushNotification: (
    jest.fn() as jest.MockedFunction<any>
  ).mockResolvedValue('mock-msg'),
}));

describe('HTTP routes (sqlite)', () => {
  let db: Awaited<ReturnType<typeof getDatabase>>;

  beforeAll(async () => {
    db = await getDatabase();
  });

  afterAll(async () => {
    await db.clearDatabase();
  });

  async function withServer(
    mount: (app: express.Application) => void,
    run: (port: number) => Promise<void>,
  ) {
    const app = express();
    app.use(express.json());
    mount(app);
    const server = http.createServer(app);
    await new Promise<void>(resolve => server.listen(0, resolve));
    const port = (server.address() as AddressInfo).port;
    try {
      await run(port);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close(err => (err ? reject(err) : resolve())),
      );
    }
  }

  beforeEach(async () => {
    await db.clearDatabase();
  });

  it('matchRoutes GET matches', async () => {
    await db.createUser({
      id: 'u1',
      name: 'n',
      email: 'e@e.com',
      plan: SubscriptionTier.FREE,
    });
    const now = new Date().toISOString();
    await db.addMatch('u1', {
      userId: 'u1',
      name: 'M',
      platform: 'tinder',
      lastUsed: now,
      hidden: false,
      deleted: false,
      createdAt: now,
      updatedAt: now,
    });
    await withServer(
      a => a.use('/api', createMatchRouter(db)),
      async port => {
        const res = await fetch(
          `http://127.0.0.1:${port}/api/users/u1/matches`,
          {headers: {'x-anonymous-user': 'u1'}},
        );
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(Array.isArray(body)).toBe(true);
        expect(body.length).toBe(1);
      },
    );
  });

  it('support tickets POST creates row', async () => {
    await db.createUser({
      id: 'u-ticket',
      name: 'T',
      email: 't@t.com',
      plan: SubscriptionTier.FREE,
    });
    await withServer(
      a => a.use('/api/support/tickets', createSupportTicketsRouter(db)),
      async port => {
        const res = await fetch(
          `http://127.0.0.1:${port}/api/support/tickets`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-anonymous-user': 'u-ticket',
            },
            body: JSON.stringify({
              userId: 'u-ticket',
              message: 'Need help',
              email: 't@t.com',
            }),
          },
        );
        expect(res.status).toBe(201);
      },
    );
  });

  it('devRoutes GET schema-health', async () => {
    await withServer(
      a => a.use('/api/dev', createDevRouter(db)),
      async port => {
        const res = await fetch(
          `http://127.0.0.1:${port}/api/dev/schema-health`,
          {headers: {'x-anonymous-user': 'dev'}},
        );
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toHaveProperty('stats');
      },
    );
  });

  it('pushNotificationRoutes POST test', async () => {
    await withServer(
      a => a.use('/api/push', createPushNotificationRouter(db)),
      async port => {
        const res = await fetch(`http://127.0.0.1:${port}/api/push/test`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-anonymous-user': 'u-push',
          },
          body: JSON.stringify({token: 'some-token'}),
        });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
      },
    );
  });
});
