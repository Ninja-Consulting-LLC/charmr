import {beforeEach, describe, expect, it} from '@jest/globals';
import {getDatabase} from '../db';
import {createMessageLimitService} from '../services/messageLimitService';
import {SubscriptionTier} from '../types/enums';

describe('messageLimitService', () => {
  let db: Awaited<ReturnType<typeof getDatabase>>;

  beforeEach(async () => {
    db = await getDatabase();
    await db.clearDatabase();
  });

  it('getMessageLimits creates missing user as free tier', async () => {
    const svc = createMessageLimitService(db);
    const lim = await svc.getMessageLimits('new-limit-user');
    expect(lim.dailyMessageLimit).toBeGreaterThan(0);
    const u = await db.getUser('new-limit-user');
    expect(u).toBeTruthy();
  });

  it('incrementMessageCount allows when under limit', async () => {
    await db.createUser({
      id: 'lim-u1',
      email: 'l@l.com',
      name: 'L',
      plan: SubscriptionTier.FREE,
    });
    const svc = createMessageLimitService(db);
    const ok = await svc.incrementMessageCount('lim-u1');
    expect(ok).toBe(true);
  });

  it('incrementMessageCount uses extra message when at cap', async () => {
    const today = new Date().toISOString().split('T')[0];
    await db.createUser({
      id: 'lim-u2',
      email: 'l2@l.com',
      name: 'L2',
      plan: SubscriptionTier.FREE,
    });
    await db.updateUser('lim-u2', {
      dailyMessagesUsed: 5,
      lastResetDate: today,
      extraMessages: 2,
    });
    const svc = createMessageLimitService(db);
    const ok = await svc.incrementMessageCount('lim-u2');
    expect(ok).toBe(true);
  });

  it('addExtraMessages and updateUserPlan', async () => {
    await db.createUser({
      id: 'lim-u3',
      email: 'l3@l.com',
      name: 'L3',
      plan: SubscriptionTier.FREE,
    });
    const svc = createMessageLimitService(db);
    await svc.addExtraMessages('lim-u3', 3);
    const u = await db.getUser('lim-u3');
    expect(u!.extraMessages).toBeGreaterThanOrEqual(3);
    await svc.updateUserPlan('lim-u3', SubscriptionTier.PRO);
    const pro = await db.getUser('lim-u3');
    expect(pro!.plan).toBe(SubscriptionTier.PRO);
  });

  it('resetDailyMessageCount delegates to db', async () => {
    const svc = createMessageLimitService(db);
    await expect(svc.resetDailyMessageCount()).resolves.toBeUndefined();
  });

  it('incrementMessageCount returns false when daily cap reached and no extras', async () => {
    const today = new Date().toISOString().split('T')[0];
    await db.createUser({
      id: 'lim-cap',
      email: 'cap@x.com',
      name: 'Cap',
      plan: SubscriptionTier.FREE,
    });
    await db.updateUser('lim-cap', {
      dailyMessagesUsed: 5,
      lastResetDate: today,
      extraMessages: 0,
    });
    const svc = createMessageLimitService(db);
    const ok = await svc.incrementMessageCount('lim-cap');
    expect(ok).toBe(false);
  });

  it('incrementMessageCount resets usage on a new calendar day', async () => {
    await db.createUser({
      id: 'lim-newday',
      email: 'nd@x.com',
      name: 'ND',
      plan: SubscriptionTier.FREE,
    });
    await db.updateUser('lim-newday', {
      dailyMessagesUsed: 5,
      lastResetDate: '2000-01-01',
      extraMessages: 0,
    });
    const svc = createMessageLimitService(db);
    const ok = await svc.incrementMessageCount('lim-newday');
    expect(ok).toBe(true);
    const u = await db.getUser('lim-newday');
    expect(u!.lastResetDate).toBe(new Date().toISOString().split('T')[0]);
    expect(u!.dailyMessagesUsed).toBe(0);
  });
});
