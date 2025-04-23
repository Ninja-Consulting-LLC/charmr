import {GenerateReplyRequest} from '../types';
import logger from '../utils/logger';
import {createOpenAIService} from './openaiService';

const openaiService = createOpenAIService();

export const generateReply = async (
  message: string,
  context?: string,
): Promise<string> => {
  try {
    logger.debug('Generating reply with OpenAI', {
      messageLength: message.length,
      hasContext: !!context,
    });

    const request: GenerateReplyRequest = {
      prompt: message,
      images: [],
      userId: 'system',
      matchId: 'direct',
      deleteAfterResponse: false,
      skipRateLimiting: true,
    };

    const response = await openaiService.generateReply(request);

    if (response.error) {
      logger.error('OpenAI service returned error', {
        error: response.error,
      });
      throw new Error(response.error);
    }

    return response.reply;
  } catch (error) {
    logger.error('Failed to generate reply with OpenAI', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
};
