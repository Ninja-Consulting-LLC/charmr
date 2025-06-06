import {GoogleGenerativeAI} from '@google/generative-ai';
import {config} from '../config/config';
import {formatPrompt, getPromptConfig} from '../config/prompts';
import {
  GenerateReplyRequest,
  GenerateReplyResponse,
  PromptVariant,
} from '../types';
import {ErrorType, MessageMode} from '../types/enums';
import {calculateCost} from '../utils/costUtils';
import logger from '../utils/logger';
import {createSandboxService} from './sandboxService';

// Helper function to get prompt variant for a user
function getPromptVariantForUser(userId: string): PromptVariant {
  // First try to use the environment variable
  if (config.prompt.variant) {
    return config.prompt.variant;
  }
  // Fallback to random assignment for A/B testing
  return Math.random() < 0.5 ? 'A' : 'B';
}

export const createGeminiService = () => {
  if (!config.gemini.apiKey && !config.gemini.sandboxMode) {
    throw new Error('GEMINI_API_KEY is required when not in sandbox mode');
  }

  const genAI =
    config.gemini.sandboxMode || !config.gemini.apiKey
      ? null
      : new GoogleGenerativeAI(config.gemini.apiKey);

  const model = genAI?.getGenerativeModel({model: config.gemini.model});
  const sandboxService = createSandboxService();

  const generateReply = async (
    request: GenerateReplyRequest,
  ): Promise<GenerateReplyResponse> => {
    // Use sandbox service if in sandbox mode or if Gemini client is not initialized
    if (config.gemini.sandboxMode || !model) {
      return sandboxService.generateReply(request);
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

      // Log user input
      if (hasText) {
        logger.info('Gemini user input:', {
          userId: request.userId,
          matchId: request.matchId,
          prompt: request.prompt,
        });
      }

      if (hasImages) {
        logger.info('Gemini image input:', {
          userId: request.userId,
          matchId: request.matchId,
          imageCount: request.images?.length,
        });
      }

      const response = await model.generateContent(prompt);
      const text = response.response.text();

      // Log raw response
      logger.info('Gemini raw response:', {
        userId: request.userId,
        matchId: request.matchId,
        model: config.gemini.model,
        rawResponse: {
          response: response.response,
          text: text,
        },
        promptVariant: variant,
      });

      // Parse the JSON response
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(text);
      } catch (error) {
        logger.error('Failed to parse Gemini response as JSON', {
          error: error instanceof Error ? error.message : 'Unknown error',
          response: text,
        });
        throw new Error('Invalid response format from Gemini');
      }

      const {summary, message: reply} = parsedResponse;

      // Log processed response
      logger.info('Gemini processed response:', {
        userId: request.userId,
        matchId: request.matchId,
        model: config.gemini.model,
        summary,
        reply,
        promptVariant: variant,
      });

      // Validate the response
      if (!reply) {
        throw new Error('Empty response from Gemini');
      }

      // Calculate costs for the response
      const costBreakdown = calculateCost(config.gemini.model, {
        prompt_tokens: 0, // Gemini doesn't provide token counts
        completion_tokens: 0,
        total_tokens: 0,
        image_count: request.images?.length || 0,
      });

      return {
        reply,
        summary,
        usage: undefined,
        mode: request.mode || MessageMode.GENERATE,
        style: request.style,
        cost: costBreakdown,
        promptVariant: variant,
      };
    } catch (error) {
      logger.error('Gemini API error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.name : 'unknown',
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('quota')) {
          return {
            reply: '',
            error:
              'The AI service is currently unavailable due to quota limits. Please try again later.',
            type: ErrorType.QUOTA_EXCEEDED,
            mode: request.mode || MessageMode.GENERATE,
            style: request.style,
          };
        }

        if (error.message.includes('rate limit')) {
          return {
            reply: '',
            error:
              'The AI service is currently busy. Please try again in a few moments.',
            type: ErrorType.RATE_LIMIT,
            mode: request.mode || MessageMode.GENERATE,
            style: request.style,
          };
        }
      }

      return {
        reply: '',
        error: 'Failed to generate reply',
        type: ErrorType.GENERATION_ERROR,
        mode: request.mode || MessageMode.GENERATE,
        style: request.style,
      };
    }
  };

  return {
    generateReply,
  };
};
