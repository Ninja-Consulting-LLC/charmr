import OpenAI from 'openai';
import {config} from '../config/config';
import {formatPrompt, getPromptConfig} from '../config/prompts';
import {getDatabase} from '../db';
import {
  GenerateReplyRequest,
  GenerateReplyResponse,
  PromptVariant,
} from '../types';
import {ErrorType, MessageMode, SubscriptionTier} from '../types/enums';
import {loadConversation, Message} from '../utils/conversationUtils';
import {calculateCost} from '../utils/costUtils';
import logger from '../utils/logger';
import {createSandboxService} from './sandboxService';

export const createOpenAIService = () => {
  if (!config.openai.apiKey && !config.openai.sandboxMode) {
    throw new Error('OPENAI_API_KEY is required when not in sandbox mode');
  }

  const openai = config.openai.sandboxMode
    ? null
    : new OpenAI({apiKey: config.openai.apiKey});

  const sandboxService = createSandboxService();

  const generateReply = async (
    request: GenerateReplyRequest,
  ): Promise<GenerateReplyResponse> => {
    if (config.openai.sandboxMode) {
      return sandboxService.generateReply(request);
    }

    if (!openai) throw new Error('OpenAI client not initialized');

    try {
      const db = await getDatabase();
      const user = await db.getUser(request.userId);
      const conversationHistory = request.matchId
        ? await loadConversation(
            request.userId,
            request.matchId,
            user?.plan || SubscriptionTier.FREE,
          )
        : [];

      // For COACH mode, limit conversation history and only include user/assistant messages
      let contextMessage = '';
      if (request.mode === MessageMode.COACH) {
        const recentMessages = conversationHistory
          .filter(
            (msg: Message) => msg.role === 'user' || msg.role === 'assistant',
          )
          .slice(-config.openai.maxCoachMessages);

        contextMessage = recentMessages
          .map(
            (msg: Message) =>
              `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`,
          )
          .join('\n\n');
      } else {
        // For other modes, keep existing behavior
        const previousAssistantMessages = conversationHistory
          .filter((msg: Message) => msg.role === 'assistant')
          .map((msg, i) => `Assistant ${i + 1}: ${msg.content}`)
          .join('\n');

        const previousSummaries = conversationHistory
          .filter((msg: Message) => msg.role === 'system')
          .map((msg, i) => `Summary ${i + 1}: ${msg.content}`)
          .join('\n');

        contextMessage = [previousSummaries, previousAssistantMessages]
          .filter(Boolean)
          .join('\n\n');
      }

      const hasImages = request.images?.length > 0;
      const hasText = Boolean(request.prompt);

      const model = selectModel(request);

      // Determine which variant to use
      const variant =
        request.promptVariant || getPromptVariantForUser(request.userId);

      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: getSystemPrompt(
            request.mode || MessageMode.GENERATE,
            hasImages,
            hasText,
            request.regenerate,
            request.regenerate ? request.prompt : undefined,
            variant,
          ),
        },
      ];

      logger.debug('System prompt generated', {
        userId: request.userId,
        mode: request.mode || MessageMode.GENERATE,
        hasImages,
        hasText,
        regenerate: request.regenerate,
        previousMessage: request.regenerate ? request.prompt : undefined,
        systemPrompt: messages[0].content,
      });

      if (hasText) {
        messages.push({role: 'user', content: request.prompt!});
      }

      if (contextMessage) {
        messages.push({
          role: 'system',
          content: `Here is the previous conversation for context:\n${contextMessage}`,
        });
      }

      if (hasImages) {
        messages.push({
          role: 'user',
          content: [
            {type: 'text', text: 'Here are the screenshots to consider:'},
            ...request.images.map(img => ({
              type: 'image_url' as const,
              image_url: {url: img, detail: 'low' as const},
            })),
          ],
        });
      }

      logger.debug('OpenAI API request payload', {
        userId: request.userId,
        model,
        messageCount: messages.length,
        regenerate: request.regenerate,
        hasImages,
        hasText,
        previousMessage: request.regenerate ? request.prompt : undefined,
        systemPrompt: messages[0].content,
        promptVariant: variant,
      });

      // Add detailed logging of full context
      logger.debug('Full context being sent to OpenAI', {
        userId: request.userId,
        messages: messages.map(msg => ({
          role: msg.role,
          content:
            typeof msg.content === 'string'
              ? msg.content
              : Array.isArray(msg.content)
              ? msg.content.map(item => {
                  if (item.type === 'text') return item;
                  if (item.type === 'image_url') {
                    return {
                      type: 'image_url',
                      url: item.image_url.url.substring(0, 50) + '...',
                      detail: item.image_url.detail,
                    };
                  }
                  return item;
                })
              : 'Unknown content type',
        })),
        conversationHistory: conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
      });

      // Log request context
      logger.info('OpenAI request context:', {
        userId: request.userId,
        matchId: request.matchId,
        model,
        mode: request.mode || MessageMode.GENERATE,
        hasImages: request.images?.length > 0,
        hasText: Boolean(request.prompt),
        regenerate: request.regenerate,
        promptVariant: variant,
      });

      // Log system prompt
      logger.info('OpenAI system prompt:', {
        userId: request.userId,
        matchId: request.matchId,
        systemPrompt: messages[0].content,
        promptVariant: variant,
      });

      // Log conversation history
      if (contextMessage) {
        logger.info('OpenAI conversation history:', {
          userId: request.userId,
          matchId: request.matchId,
          conversationHistory: conversationHistory.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
        });
      }

      // Log user input
      if (hasText) {
        logger.info('OpenAI user input:', {
          userId: request.userId,
          matchId: request.matchId,
          prompt: request.prompt,
        });
      }

      if (hasImages) {
        logger.info('OpenAI image input:', {
          userId: request.userId,
          matchId: request.matchId,
          imageCount: request.images?.length,
        });
      }

      const response = await openai.chat.completions.create({
        model,
        messages,
        max_tokens: config.openai.maxTokens,
        temperature: config.openai.temperature,
        response_format:
          request.mode === MessageMode.COACH
            ? undefined
            : {type: 'json_object'},
      });

      const text = response.choices[0]?.message?.content || '';
      if (!text) throw new Error('Empty response from OpenAI');

      // Log raw response
      logger.info('OpenAI raw response:', {
        userId: request.userId,
        matchId: request.matchId,
        model,
        rawResponse: {
          id: response.id,
          model: response.model,
          usage: response.usage,
          choices: response.choices.map(choice => ({
            index: choice.index,
            message: choice.message,
            finish_reason: choice.finish_reason,
          })),
        },
        rawText: text,
        promptVariant: variant,
      });

      // For COACH mode, return the raw response without JSON parsing
      if (request.mode === MessageMode.COACH) {
        return {
          reply: text,
          summary: undefined,
          usage: response.usage,
          mode: MessageMode.COACH,
          style: request.style,
          cost: calculateCost(model, {
            prompt_tokens: response.usage?.prompt_tokens || 0,
            completion_tokens: response.usage?.completion_tokens || 0,
            total_tokens: response.usage?.total_tokens || 0,
            image_count: request.images?.length || 0,
          }),
          promptVariant: variant,
        };
      }

      // For other modes, parse the JSON response
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(text);
      } catch (error) {
        logger.error('Failed to parse OpenAI response', {
          error,
          response: text,
        });
        throw new Error('Invalid response format');
      }

      const {summary, message: reply} = parsedResponse;

      // Log processed response
      logger.info('OpenAI processed response:', {
        userId: request.userId,
        matchId: request.matchId,
        model,
        summary,
        reply,
        promptVariant: variant,
      });

      return {
        reply,
        summary,
        usage: response.usage,
        mode: request.mode || MessageMode.GENERATE,
        style: request.style,
        cost: calculateCost(model, {
          prompt_tokens: response.usage?.prompt_tokens || 0,
          completion_tokens: response.usage?.completion_tokens || 0,
          total_tokens: response.usage?.total_tokens || 0,
          image_count: request.images?.length || 0,
        }),
        promptVariant: variant,
      };
    } catch (error: any) {
      logger.error('OpenAI API error', {error});
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

// 💡 Model selection logic
function selectModel(request: GenerateReplyRequest): string {
  const isImageOnly = request.images?.length && !request.prompt;
  if (isImageOnly) return config.openai.model; // vision support
  if (request.mode === MessageMode.COACH) return 'gpt-4o-mini'; // cost-optimized
  return config.openai.model;
}

// Helper function to get prompt variant for a user
function getPromptVariantForUser(userId: string): PromptVariant {
  // First try to use the environment variable
  if (config.prompt.variant) {
    return config.prompt.variant;
  }
  // Fallback to random assignment for A/B testing
  return Math.random() < 0.5 ? 'A' : 'B';
}

// 💡 Prompt selection logic
function getSystemPrompt(
  mode: MessageMode,
  hasImages: boolean,
  hasText: boolean,
  regenerate?: boolean,
  previousMessage?: string,
  variant?: PromptVariant,
): string {
  const config = getPromptConfig(mode, hasImages, hasText, variant || 'A');
  return formatPrompt(config, regenerate, previousMessage);
}
