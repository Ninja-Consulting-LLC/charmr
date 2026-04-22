import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import type {Database} from '../db/types';

const mockOpenAI = jest.fn();
const mockGemini = jest.fn();

jest.mock('../services/openaiService', () => ({
  createOpenAIService: (db: Database) => {
    mockOpenAI(db);
    return {generateReply: jest.fn()};
  },
}));

jest.mock('../services/geminiService', () => ({
  createGeminiService: () => {
    mockGemini();
    return {generateReply: jest.fn()};
  },
}));

describe('createLlmProvider', () => {
  beforeEach(() => {
    mockOpenAI.mockClear();
    mockGemini.mockClear();
    jest.resetModules();
  });

  it('returns OpenAI service by default and for openai name', async () => {
    const {createLlmProvider} = await import('../services/llm/llmProvider');
    const db = {} as Database;
    const p1 = createLlmProvider(db, 'openai');
    const p2 = createLlmProvider(db, 'openai');
    expect(p1).toBeDefined();
    expect(p2).toBeDefined();
    expect(mockOpenAI).toHaveBeenCalled();
    expect(mockGemini).not.toHaveBeenCalled();
  });

  it('returns Gemini service when name is gemini', async () => {
    const {createLlmProvider} = await import('../services/llm/llmProvider');
    const db = {} as Database;
    createLlmProvider(db, 'gemini');
    expect(mockGemini).toHaveBeenCalled();
  });

  it('throws in production when Gemini is selected without override', async () => {
    const prevEnv = process.env.NODE_ENV;
    const prevAllow = process.env.CHARMR_ALLOW_GEMINI_IN_PRODUCTION;
    process.env.NODE_ENV = 'production';
    delete process.env.CHARMR_ALLOW_GEMINI_IN_PRODUCTION;
    jest.resetModules();
    const {createLlmProvider} = await import('../services/llm/llmProvider');
    expect(() => createLlmProvider({} as Database, 'gemini')).toThrow(
      /AI_SERVICE=gemini is disabled in production/,
    );
    process.env.NODE_ENV = prevEnv;
    if (prevAllow === undefined) {
      delete process.env.CHARMR_ALLOW_GEMINI_IN_PRODUCTION;
    } else {
      process.env.CHARMR_ALLOW_GEMINI_IN_PRODUCTION = prevAllow;
    }
  });

  it('allows Gemini in production when CHARMR_ALLOW_GEMINI_IN_PRODUCTION=true', async () => {
    const prevEnv = process.env.NODE_ENV;
    const prevAllow = process.env.CHARMR_ALLOW_GEMINI_IN_PRODUCTION;
    process.env.NODE_ENV = 'production';
    process.env.CHARMR_ALLOW_GEMINI_IN_PRODUCTION = 'true';
    jest.resetModules();
    const {createLlmProvider} = await import('../services/llm/llmProvider');
    const db = {} as Database;
    createLlmProvider(db, 'gemini');
    expect(mockGemini).toHaveBeenCalled();
    process.env.NODE_ENV = prevEnv;
    if (prevAllow === undefined) {
      delete process.env.CHARMR_ALLOW_GEMINI_IN_PRODUCTION;
    } else {
      process.env.CHARMR_ALLOW_GEMINI_IN_PRODUCTION = prevAllow;
    }
  });
});
