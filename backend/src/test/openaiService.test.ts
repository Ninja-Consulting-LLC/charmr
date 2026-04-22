import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals';
import {getDatabase} from '../db';
import {MessageMode} from '../types/enums';
import {SubscriptionTier} from '../types/enums';

declare global {
  var __openaiChatCreate: jest.MockedFunction<any>;
}

(global as any).__openaiChatCreate = jest.fn();

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: (...args: unknown[]) =>
          (global as any).__openaiChatCreate(...args),
      },
    },
  })),
}));

describe('createOpenAIService', () => {
  let db: Awaited<ReturnType<typeof getDatabase>>;

  beforeEach(async () => {
    db = await getDatabase();
    await db.clearDatabase();
    (global as any).__openaiChatCreate.mockReset();
    await db.createUser({
      id: 'openai-u1',
      email: 'o@o.com',
      name: 'O',
      plan: SubscriptionTier.FREE,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns parsed reply for home screen (no matchId)', async () => {
    (global as any).__openaiChatCreate.mockResolvedValue({
      choices: [
        {message: {content: JSON.stringify({message: 'Home reply'})}},
      ],
      usage: {prompt_tokens: 1, completion_tokens: 2, total_tokens: 3},
    });
    const {createOpenAIService} = await import('../services/openaiService');
    const svc = createOpenAIService(db);
    const res = await svc.generateReply({
      userId: 'openai-u1',
      prompt: 'Hello',
      images: [],
      skipRateLimiting: true,
    });
    expect(res.reply).toBe('Home reply');
    expect(res.error).toBeUndefined();
  });

  it('returns reply and summary when matchId set', async () => {
    const now = new Date().toISOString();
    const m = await db.addMatch('openai-u1', {
      userId: 'openai-u1',
      name: 'M',
      platform: 't',
      lastUsed: now,
      hidden: false,
      deleted: false,
      createdAt: now,
      updatedAt: now,
    });
    (global as any).__openaiChatCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              summary: 'S',
              message: 'Chat reply',
            }),
          },
        },
      ],
      usage: {prompt_tokens: 1, completion_tokens: 2, total_tokens: 3},
    });
    const {createOpenAIService} = await import('../services/openaiService');
    const svc = createOpenAIService(db);
    const res = await svc.generateReply({
      userId: 'openai-u1',
      matchId: String(m.id),
      prompt: 'Hi',
      images: [],
      mode: MessageMode.GENERATE,
      skipRateLimiting: true,
    });
    expect(res.reply).toBe('Chat reply');
    expect(res.summary).toBe('S');
  });

  it('returns generation error shape when API throws', async () => {
    (global as any).__openaiChatCreate.mockRejectedValue(new Error('api down'));
    const {createOpenAIService} = await import('../services/openaiService');
    const svc = createOpenAIService(db);
    const res = await svc.generateReply({
      userId: 'openai-u1',
      prompt: 'x',
      images: [],
      skipRateLimiting: true,
    });
    expect(res.reply).toBe('');
    expect(res.error).toBe('Failed to generate reply');
  });

  it('includes image parts when images provided', async () => {
    (global as any).__openaiChatCreate.mockResolvedValue({
      choices: [
        {message: {content: JSON.stringify({message: 'With image'})}},
      ],
      usage: {prompt_tokens: 1, completion_tokens: 2, total_tokens: 3},
    });
    const {createOpenAIService} = await import('../services/openaiService');
    const svc = createOpenAIService(db);
    await svc.generateReply({
      userId: 'openai-u1',
      prompt: '',
      images: ['https://example.com/a.png'],
      skipRateLimiting: true,
    });
    const call = (global as any).__openaiChatCreate.mock.calls[0][0];
    expect(JSON.stringify(call.messages)).toContain('image_url');
  });
});
