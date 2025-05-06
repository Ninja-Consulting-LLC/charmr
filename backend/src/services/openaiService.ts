import OpenAI from 'openai';
import {config} from '../config/config';
import {formatPromptWithContext} from '../config/prompts';
import {GenerateReplyRequest, GenerateReplyResponse} from '../types';
import {appendConversation} from '../utils/conversationUtils';
import {calculateCost} from '../utils/costUtils';
import logger from '../utils/logger';
import {createSandboxService} from './sandboxService';

export const createOpenAIService = () => {
  if (!config.openai.apiKey && !config.openai.sandboxMode) {
    throw new Error('OPENAI_API_KEY is required when not in sandbox mode');
  }

  const openai = config.openai.sandboxMode
    ? null
    : new OpenAI({
        apiKey: config.openai.apiKey,
      });

  const sandboxService = createSandboxService();

  const generateReply = async (
    request: GenerateReplyRequest,
  ): Promise<GenerateReplyResponse> => {
    // Use sandbox service if in sandbox mode or if OpenAI client is not initialized
    if (config.openai.sandboxMode || !openai) {
      return sandboxService.generateReply(request);
    }

    try {
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: formatPromptWithContext(request.prompt),
        },
      ];

      if (request.images?.length) {
        messages.push({
          role: 'user',
          content: [
            {type: 'text', text: 'Here are the images to consider:'},
            ...request.images.map(img => ({
              type: 'image_url' as const,
              image_url: {url: img, detail: 'low' as const},
            })),
          ] as OpenAI.Chat.ChatCompletionContentPart[],
        });
      }

      const response = await openai.chat.completions.create({
        model: config.openai.model,
        messages,
        max_tokens: config.openai.maxTokens,
        temperature: config.openai.temperature,
      });

      const text = response.choices[0]?.message?.content || '';
      if (!text) {
        throw new Error('No response from OpenAI');
      }

      // Calculate and log costs if usage data is available
      if (response.usage) {
        const costBreakdown = calculateCost(config.openai.model, {
          ...response.usage,
          image_count: request.images?.length || 0,
        });
        logger.info('OpenAI API usage and cost', {
          model: config.openai.model,
          usage: response.usage,
          cost: {
            input: costBreakdown.inputCost.toFixed(6),
            output: costBreakdown.outputCost.toFixed(6),
            total: costBreakdown.totalCost.toFixed(6),
          },
        });
      }

      // Parse the response to extract summary and message
      const summaryMatch = text.match(/<summary>(.*?)<\/summary>/s);
      const messageMatch = text.match(/<message>(.*?)<\/message>/s);

      if (!messageMatch) {
        throw new Error('Invalid response format from OpenAI');
      }

      const summary = summaryMatch ? summaryMatch[1].trim() : '';
      const reply = messageMatch[1].trim();

      // Save both the summary and the message
      if (!request.deleteAfterResponse) {
        await appendConversation(
          request.userId,
          request.matchId,
          summary,
          reply,
        );
      }

      return {
        reply,
        summary,
        usage: response.usage,
      };
    } catch (error: any) {
      logger.error('OpenAI API error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        type: error.type || 'unknown',
        code: error.code || 'unknown',
        status: error.status || 'unknown',
      });

      // Handle specific error types
      if (
        error.code === 'insufficient_quota' ||
        error.type === 'insufficient_quota'
      ) {
        return {
          reply: '',
          error:
            'The AI service is currently unavailable due to quota limits. Please try again later.',
          type: 'QUOTA_EXCEEDED',
        };
      }

      if (error.status === 429) {
        return {
          reply: '',
          error:
            'The AI service is currently busy. Please try again in a few moments.',
          type: 'RATE_LIMIT',
        };
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
