import OpenAI from 'openai';
import {config} from '../config/config';
import {getDatabase} from '../db';
import {GenerateReplyRequest, GenerateReplyResponse} from '../types';
import {
  appendConversation,
  loadConversation,
  Message,
} from '../utils/conversationUtils';
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
    // Use sandbox service if in sandbox mode
    if (config.openai.sandboxMode) {
      return sandboxService.generateReply(request);
    }

    // Ensure OpenAI client is initialized
    if (!openai) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      // Load conversation history for context
      const db = await getDatabase();
      const user = await db.getUser(request.userId);
      const conversationHistory = request.matchId
        ? await loadConversation(request.userId, request.matchId, user?.plan)
        : [];

      // Extract previous messages for context
      const previousAssistantMessages = conversationHistory
        .filter((msg: Message) => msg.role === 'assistant')
        .map((msg: Message) => msg.content)
        .join('\n');

      const previousSummaries = conversationHistory
        .filter((msg: Message) => msg.role === 'system')
        .map((msg: Message) => msg.content)
        .join('\n');

      const contextMessage =
        previousAssistantMessages || previousSummaries
          ? `Here is the conversation history for context:\n\nPrevious Summaries:\n${previousSummaries}\n\nPrevious Messages:\n${previousAssistantMessages}`
          : '';

      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: `You are a helpful dating assistant. Your task is to help users craft engaging and appropriate responses to their matches. Consider the conversation history and context when generating responses.

Guidelines:
1. Keep responses natural and conversational
2. Match the tone and style requested by the user
3. Show genuine interest in the match's interests and experiences
4. Keep responses concise but engaging
5. Avoid being overly aggressive or inappropriate
6. Use the conversation history to maintain context and build rapport

Respond in the following JSON format:
{
  "summary": "A brief summary of the match's interests and conversation style based on the history",
  "message": "Your suggested reply to the match"
}`,
        },
        {
          role: 'user',
          content: request.prompt,
        },
      ];

      if (contextMessage) {
        messages.push({
          role: 'system',
          content: contextMessage,
        });
      }

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

      logger.debug('OpenAI API request payload', {
        userId: request.userId,
        matchId: request.matchId,
        model: request.model || config.openai.model,
        messageCount: messages.length,
        messages: messages.map(msg => ({
          role: msg.role,
          contentLength:
            typeof msg.content === 'string' ? msg.content.length : 'complex',
          hasImages:
            Array.isArray(msg.content) &&
            msg.content.some(c => c.type === 'image_url'),
        })),
        maxTokens: config.openai.maxTokens,
        temperature: config.openai.temperature,
      });

      const response = await openai.chat.completions.create({
        model: request.model || config.openai.model,
        messages,
        max_tokens: config.openai.maxTokens,
        temperature: config.openai.temperature,
        response_format: {type: 'json_object'},
      });

      const text = response.choices[0]?.message?.content || '';
      if (!text) {
        throw new Error('Empty response from OpenAI');
      }

      // Parse the JSON response
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(text);
      } catch (error) {
        logger.error('Failed to parse OpenAI response as JSON', {
          error: error instanceof Error ? error.message : 'Unknown error',
          response: text,
        });
        throw new Error('Invalid response format from OpenAI');
      }

      const {summary, message: reply} = parsedResponse;

      // Calculate and log costs if usage data is available
      if (response.usage) {
        const model = request.model || config.openai.model;
        const costBreakdown = calculateCost(model, {
          ...response.usage,
          image_count: request.images?.length || 0,
        });
        logger.info('OpenAI API usage and cost', {
          model,
          usage: response.usage,
          cost: {
            input: costBreakdown.inputCost.toFixed(6),
            output: costBreakdown.outputCost.toFixed(6),
            total: costBreakdown.totalCost.toFixed(6),
          },
        });

        // Save both the summary and the message
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

          // Save the message cost if usage data is available
          if (response.usage) {
            await db.saveMessageCost(savedMessage.id, {
              model,
              promptTokens: costBreakdown.usage.prompt_tokens,
              completionTokens: costBreakdown.usage.completion_tokens,
              totalTokens: costBreakdown.usage.total_tokens,
              inputCost: costBreakdown.inputCost,
              outputCost: costBreakdown.outputCost,
              totalCost: costBreakdown.totalCost,
              timestamp,
            });
          }
        }
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
