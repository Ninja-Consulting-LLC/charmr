import OpenAI from 'openai';
import { config } from '../config/config';
import { formatPrompt, getPromptConfig } from '../config/prompts';
import { getDatabase } from '../db';
import {
  GenerateReplyRequest,
  GenerateReplyResponse,
  PromptVariant,
} from '../types';
import { ErrorType, MessageMode, SubscriptionTier } from '../types/enums';
import { loadConversation, Message } from '../utils/conversationUtils';
import { calculateCost } from '../utils/costUtils';
import logger from '../utils/logger';
import { createSandboxService } from './sandboxService';
import { createSummaryService } from './summaryService';

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

      // For both COACH and GENERATE modes, include user/assistant messages and summary
      let contextMessage = '';

      // Get the match summary if we have a matchId and we're in chat screen
      let matchSummary: string | undefined;
      if (request.matchId) {
        const summaryService = createSummaryService(db);
        matchSummary = await summaryService.getMatchSummary(request.userId, request.matchId);
      }

      // Format the conversation history if we have any messages
      const recentMessages = conversationHistory
        .filter(
          (msg: Message) => msg.role === 'user' || msg.role === 'assistant',
        )
        .slice(-config.openai.maxCoachMessages);

      const conversationText = recentMessages.length > 0
        ? recentMessages
            .map(
              (msg: Message) => {
                if (msg.role === 'user') {
                  if (msg.type === 'image') {
                    return `User shared a screenshot${msg.content ? ` with the message: "${msg.content}"` : ''}`;
                  }
                  return `User: ${msg.content}`;
                }
                if (msg.role === 'assistant') {
                  return `AI Assistant: ${msg.content}`;
                }
                return ''; // Should never happen due to filter above
              }
            )
            .filter(Boolean) // Remove any empty strings
            .join('\n\n')
        : '';

      // Only include summary and conversation if they exist and we're in chat screen
      if (request.matchId) {
        if (matchSummary && conversationText) {
          contextMessage = `Match Summary:\n${matchSummary}\n\nConversation History:\n${conversationText}`;
        } else if (matchSummary) {
          contextMessage = `Match Summary:\n${matchSummary}`;
        } else if (conversationText) {
          contextMessage = `Conversation History:\n${conversationText}`;
        }
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
            request.matchSummary,
            variant,
          ),
        },
      ];

      // Add fallback prompt for image-only requests
      const fallbackPrompt = "This is a screenshot from a dating app. Can you help me come up with a witty reply?";
      const userPrompt = request.prompt || (hasImages ? fallbackPrompt : '');

      if (userPrompt) {
        messages.push({role: 'user', content: userPrompt});
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

      // Log the exact messages being sent to OpenAI
      logger.info('OpenAI request:', {
        userId: request.userId,
        matchId: request.matchId,
        model,
        mode: request.mode || MessageMode.GENERATE,
        messages: messages.map(msg => ({
          role: msg.role,
          content: typeof msg.content === 'string'
            ? msg.content
            : Array.isArray(msg.content)
            ? msg.content.map(item => {
                if (item.type === 'text') return item.text;
                if (item.type === 'image_url') return '[IMAGE]';
                return item;
              })
            : 'Unknown content type',
        })),
      });

      const response = await openai.chat.completions.create({
        model,
        messages,
        max_tokens: config.openai.maxTokens,
        temperature: config.openai.temperature,
        response_format:
          request.mode === MessageMode.COACH || !request.matchId
            ? undefined
            : {type: 'json_object'},
      });

      const text = response.choices[0]?.message?.content || '';
      if (!text) throw new Error('Empty response from OpenAI');

      // Log the exact response from OpenAI
      logger.info('OpenAI response:', {
        userId: request.userId,
        matchId: request.matchId,
        model,
        response: text,
        usage: response.usage,
      });

      // For COACH mode or home screen (no matchId), return the raw response without JSON parsing
      if (request.mode === MessageMode.COACH || !request.matchId) {
        return {
          reply: text,
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
      }

      // For chat screen, parse the JSON response
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
  if (request.mode === MessageMode.COACH) return config.openai.model; // cost-optimized
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
  matchSummary?: string,
  variant?: PromptVariant,
): string {
  const promptConfig = getPromptConfig(
    mode,
    hasImages,
    hasText,
    variant || 'A',
  );

  // For home screen (no matchId), don't include first message context
  if (!matchSummary) {
    const basePrompt = promptConfig.basePrompt.replace(
      "If it's the first message, help them break the ice. If it's mid-thread, help them flirt, escalate, or keep it fun.",
      "Help them break the ice."
    );
    promptConfig.basePrompt = basePrompt;
  }

  return formatPrompt(promptConfig, mode, regenerate, previousMessage, !!matchSummary);
}
