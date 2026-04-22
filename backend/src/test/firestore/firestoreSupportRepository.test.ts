import {afterAll, beforeAll, describe, expect, it} from '@jest/globals';
import {FirestoreSupportRepository} from '../../db/repositories/firestoreSupportRepository';

describe('FirestoreSupportRepository (emulator)', () => {
  let repo: FirestoreSupportRepository;

  beforeAll(() => {
    repo = new FirestoreSupportRepository();
  });

  afterAll(async () => {
    await repo.clearDatabase();
  });

  it('creates and lists tickets for a user', async () => {
    await repo.clearDatabase();
    const now = new Date();
    const created = await repo.createTicket({
      userId: 'user-a',
      subject: 'Hello',
      message: 'Need help',
      status: 'open',
      createdAt: now,
      updatedAt: now,
    });
    expect(created.id).toBeTruthy();
    expect(created.userId).toBe('user-a');

    const list = await repo.getTicketsByUserId('user-a');
    expect(list).toHaveLength(1);
    expect(list[0].subject).toBe('Hello');
  });

  it('updates ticket status', async () => {
    await repo.clearDatabase();
    const now = new Date();
    const created = await repo.createTicket({
      userId: 'user-b',
      subject: 'S',
      message: 'M',
      status: 'open',
      createdAt: now,
      updatedAt: now,
    });
    await repo.updateTicketStatus(created.id, 'closed');
    const list = await repo.getTicketsByUserId('user-b');
    expect(list[0].status).toBe('closed');
  });
});
