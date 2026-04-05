import {Database} from '../../db/types';
import {
  GenerateReplyRequest,
  GenerateReplyResponse,
} from '../../types';
import {createGeminiService} from '../geminiService';
import {createOpenAIService} from '../openaiService';

export type LlmServiceName = 'openai' | 'gemini';

export type LlmProvider = {
  generateReply(
    request: GenerateReplyRequest,
  ): Promise<GenerateReplyResponse>;
};

/**
 * Factory for the active LLM backend. OpenAI receives `db` for conversation context;
 * Gemini remains stateless here (images not wired in controller for gemini path).
 */
export function createLlmProvider(
  db: Database,
  name: LlmServiceName,
): LlmProvider {
  if (name === 'gemini') {
    return createGeminiService();
  }
  return createOpenAIService(db);
}
