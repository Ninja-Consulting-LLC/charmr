import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals';
import {MessageMode} from '../types/enums';

describe('createGeminiService', () => {
  const originalVariant = process.env.PROMPT_VARIANT;

  beforeEach(() => {
    jest.resetModules();
    process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'k';
    process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'gk';
    delete process.env.PROMPT_VARIANT;
  });

  afterEach(() => {
    if (originalVariant === undefined) {
      delete process.env.PROMPT_VARIANT;
    } else {
      process.env.PROMPT_VARIANT = originalVariant;
    }
  });

  it('returns not-implemented payload for generateReply', async () => {
    const {createGeminiService} = await import('../services/geminiService');
    const svc = createGeminiService();
    const res = await svc.generateReply({
      userId: 'g1',
      prompt: 'Hi',
      images: [],
      mode: MessageMode.GENERATE,
    });
    expect(res.error).toContain('not implemented');
    expect(res.reply).toBe('');
  });

  it('still returns structured error when PROMPT_VARIANT is B', async () => {
    process.env.PROMPT_VARIANT = 'B';
    jest.resetModules();
    const {createGeminiService} = await import('../services/geminiService');
    const svc = createGeminiService();
    const res = await svc.generateReply({
      userId: 'g2',
      prompt: 'x',
      images: [],
    });
    expect(res.error).toBeTruthy();
  });
});
