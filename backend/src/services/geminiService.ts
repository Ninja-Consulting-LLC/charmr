import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/config';
import { formatPrompt, getPromptConfig } from '../config/prompts';
import {
    GenerateReplyRequest,
    GenerateReplyResponse,
    PromptVariant,
} from '../types';
import { ErrorType, MessageMode } from '../types/enums';
import logger from '../utils/logger';

// Helper function to get prompt variant for a user
function getPromptVariantForUser(_userId: string): PromptVariant {
  // First try to use the environment variable
  if (config.prompt.variant) {
    return config.prompt.variant;
  }
  // Fallback to random assignment for A/B testing
  return Math.random() < 0.5 ? 'A' : 'B';
}

export const createGeminiService = () => {
  if (!config.gemini.apiKey) {
    throw new Error('GEMINI_API_KEY is required');
  }

  const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  const model = genAI.getGenerativeModel({model: config.gemini.model});

  const generateReply = async (
    request: GenerateReplyRequest,
  ): Promise<GenerateReplyResponse> => {
    if (!model) {
      throw new Error('Gemini model not initialized');
    }

    try {
      const hasImages = request.images?.length > 0;
      const hasText = Boolean(request.prompt);
      const variant =
        request.promptVariant || getPromptVariantForUser(request.userId);

      const promptConfig = getPromptConfig(
        request.mode || MessageMode.GENERATE,
        hasImages,
        hasText,
        variant,
      );

      const prompt = formatPrompt(
        promptConfig,
        request.mode || MessageMode.GENERATE,
        request.regenerate,
        request.regenerate ? request.prompt : undefined,
      );

      // Log request context
      logger.info('Gemini request context:', {
        userId: request.userId,
        matchId: request.matchId,
        model: config.gemini.model,
        mode: request.mode || MessageMode.GENERATE,
        hasImages: request.images?.length > 0,
        hasText: Boolean(request.prompt),
        regenerate: request.regenerate,
        promptVariant: variant,
      });

      // Log system prompt
      logger.info('Gemini system prompt:', {
        userId: request.userId,
        matchId: request.matchId,
        systemPrompt: prompt,
        promptVariant: variant,
      });

      // Product path is OpenAI today; Gemini branch is intentionally stubbed until vision/chat is wired.
      return {
        reply: '',
        error: 'Gemini integration not implemented',
        type: ErrorType.GENERATION_ERROR,
        mode: request.mode || MessageMode.GENERATE,
        style: request.style,
      };
    } catch (error: any) {
      logger.error('Gemini API error', {error});
      return {
        reply: '',
        error: 'Failed to generate reply',
        type: ErrorType.GENERATION_ERROR,
        mode: request.mode || MessageMode.GENERATE,
        style: request.style,
      };
    }
  };

  return {generateReply};
};
