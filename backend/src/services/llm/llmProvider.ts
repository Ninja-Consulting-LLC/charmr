import {Database} from '../../db/types';
import {
  GenerateReplyRequest,
  GenerateReplyResponse,
} from '../../types';
import logger from '../../utils/logger';
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
    const nodeEnv = process.env.NODE_ENV || 'development';
    if (
      nodeEnv === 'production' &&
      process.env.CHARMR_ALLOW_GEMINI_IN_PRODUCTION !== 'true'
    ) {
      throw new Error(
        'AI_SERVICE=gemini is disabled in production until Gemini has full parity with the OpenAI path. Set AI_SERVICE=openai, or set CHARMR_ALLOW_GEMINI_IN_PRODUCTION=true to override.',
      );
    }
    if (nodeEnv !== 'production') {
      logger.warning(
        'Gemini is selected for generate-reply; responses may fail or be empty until Gemini parity is complete.',
      );
    }
    return createGeminiService();
  }
  return createOpenAIService(db);
}
