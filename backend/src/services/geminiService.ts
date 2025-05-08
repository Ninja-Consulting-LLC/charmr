import {GoogleGenerativeAI} from '@google/generative-ai';
import {config} from '../config/config';
import {formatPromptWithContext} from '../config/prompts';
import {getDatabase} from '../db';
import {GenerateReplyRequest, GenerateReplyResponse} from '../types';
import {appendConversation} from '../utils/conversationUtils';
import logger from '../utils/logger';
import {createSandboxService} from './sandboxService';

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
      const prompt = formatPromptWithContext(request.prompt);

      logger.debug('Gemini API request payload', {
        userId: request.userId,
        matchId: request.matchId,
        model: config.gemini.model,
        promptLength: prompt.length,
        hasImages: request.images?.length > 0,
        imageCount: request.images?.length,
        maxTokens: config.gemini.maxTokens,
        temperature: config.gemini.temperature,
      });

      const response = await model.generateContent(prompt);
      const text = response.response.text();

      logger.info('Gemini API response:', {
        response: JSON.stringify(response, null, 2),
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

      // Validate the response
      if (!reply) {
        throw new Error('Empty response from Gemini');
      }

      // Save the message and its costs if not deleting after response
      if (!request.deleteAfterResponse) {
        const db = await getDatabase();
        const timestamp = new Date().toISOString();

        // Save the message and its costs
        const savedMessage = await appendConversation(
          request.userId,
          request.matchId,
          summary,
          reply,
        );

        // Save the message cost (with zero values since Gemini doesn't provide token counts)
        await db.saveMessageCost(savedMessage.id, {
          model: config.gemini.model,
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          inputCost: 0,
          outputCost: 0,
          totalCost: 0,
          timestamp,
        });
      }

      return {
        reply,
        summary,
        usage: undefined,
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
            type: 'QUOTA_EXCEEDED',
          };
        }

        if (error.message.includes('rate limit')) {
          return {
            reply: '',
            error:
              'The AI service is currently busy. Please try again in a few moments.',
            type: 'RATE_LIMIT',
          };
        }
      }

      return {
        reply: '',
        error: 'Failed to generate reply',
        type: 'GENERATION_ERROR',
      };
    }
  };

  return {
    generateReply,
  };
};
