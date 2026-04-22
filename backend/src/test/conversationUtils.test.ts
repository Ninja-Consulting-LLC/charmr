import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals';
import {getDatabase} from '../db';
import * as repositories from '../db/repositories';
import {MessageMode, MessageRole, MessageType, SubscriptionTier} from '../types/enums';
import {appendConversation, loadConversation} from '../utils/conversationUtils';

describe('conversationUtils', () => {
  let db: Awaited<ReturnType<typeof getDatabase>>;
  const userId = 'conv-u1';
  let matchId: string;

  beforeEach(async () => {
    db = await getDatabase();
    await db.clearDatabase();
    await db.createUser({
      id: userId,
      email: 'c@x.com',
      name: 'C',
      plan: SubscriptionTier.FREE,
    });
    const now = new Date().toISOString();
    const m = await db.addMatch(userId, {
      userId,
      name: 'M',
      platform: 't',
      lastUsed: now,
      hidden: false,
      deleted: false,
      createdAt: now,
      updatedAt: now,
    });
    matchId = String(m.id);
    await db.updateMatch(userId, matchId, {summary: 'Match summary text'});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('loadConversation prepends summary and sorts by timestamp', async () => {
    const repo = repositories.getMessageRepository(db);
    await repo.createMessage(userId, matchId, {
      role: MessageRole.USER,
      type: MessageType.TEXT,
      mode: MessageMode.GENERATE,
      content: 'later',
      timestamp: new Date('2099-01-02').toISOString(),
    });
    await repo.createMessage(userId, matchId, {
      role: MessageRole.USER,
      type: MessageType.TEXT,
      mode: MessageMode.GENERATE,
      content: 'earlier',
      timestamp: new Date('2099-01-01').toISOString(),
    });

    const messages = await loadConversation(db, userId, matchId, 'free', 10);
    expect(messages[0].type).toBe(MessageType.SUMMARY);
    expect(messages[0].content).toBe('Match summary text');
    const texts = messages
      .filter(m => m.type === MessageType.TEXT)
      .map(m => m.content);
    expect(texts).toEqual(['earlier', 'later']);
  });

  it('loadConversation returns empty array when repository fails', async () => {
    const getMessagesByMatch = jest.fn() as jest.MockedFunction<any>;
    getMessagesByMatch.mockRejectedValue(new Error('repo fail'));
    jest.spyOn(repositories, 'getMessageRepository').mockReturnValue({
      getMessagesByMatch,
    } as any);

    const messages = await loadConversation(db, userId, matchId, 'free');
    expect(messages).toEqual([]);
  });

  it('appendConversation saves images, text, assistant reply and optional cost', async () => {
    const assistant = await appendConversation(
      db,
      userId,
      matchId,
      'Assistant says hi',
      ['data:image/jpeg;base64,abc'],
      'User prompt',
      MessageMode.GENERATE,
      undefined,
      {
        model: 'gpt-test',
        promptTokens: 1,
        completionTokens: 2,
        totalTokens: 3,
        inputCost: 0.001,
        outputCost: 0.002,
        totalCost: 0.003,
        costTimestamp: new Date().toISOString(),
      },
    );
    expect(assistant.role).toBe(MessageRole.ASSISTANT);
    expect(assistant.totalCost).toBe(0.003);

    const {messages} = await repositories
      .getMessageRepository(db)
      .getMessagesByMatch(userId, matchId);
    expect(messages.some(m => m.type === MessageType.IMAGE)).toBe(true);
    expect(messages.some(m => m.content === 'User prompt')).toBe(true);
  });
});
