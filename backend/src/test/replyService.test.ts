import {beforeEach, describe, expect, it, jest} from '@jest/globals';

(global as any).__openaiChatCreateReplySvc = jest.fn();

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: (...args: unknown[]) =>
          (global as any).__openaiChatCreateReplySvc(...args),
      },
    },
  })),
}));

describe('replyService.generateReply', () => {
  beforeEach(() => {
    (global as any).__openaiChatCreateReplySvc.mockReset();
  });

  it('returns assistant text on success', async () => {
    (global as any).__openaiChatCreateReplySvc.mockResolvedValue({
      choices: [
        {message: {content: JSON.stringify({message: 'OK', summary: ''})}},
      ],
      usage: {prompt_tokens: 1, completion_tokens: 1, total_tokens: 2},
    });
    const {generateReply} = await import('../services/replyService');
    const text = await generateReply('hello');
    expect(text).toBe('OK');
  });

  it('throws when service returns error payload', async () => {
    (global as any).__openaiChatCreateReplySvc.mockResolvedValue({
      choices: [{message: {content: '{'}}],
    });
    const {generateReply} = await import('../services/replyService');
    await expect(generateReply('x')).rejects.toThrow();
  });
});
