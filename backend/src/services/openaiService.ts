import OpenAI from 'openai';
import {config} from '../config/config';
import {getDatabase} from '../db';
import {GenerateReplyRequest, GenerateReplyResponse} from '../types';
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

      const previousAssistantMessages = conversationHistory
        .filter((msg: Message) => msg.role === 'assistant')
        .map((msg, i) => `Assistant ${i + 1}: ${msg.content}`)
        .join('\n');

      const previousSummaries = conversationHistory
        .filter((msg: Message) => msg.role === 'system')
        .map((msg, i) => `Summary ${i + 1}: ${msg.content}`)
        .join('\n');

      const contextMessage = [previousSummaries, previousAssistantMessages]
        .filter(Boolean)
        .join('\n\n');

      const hasImages = request.images?.length > 0;
      const hasText = Boolean(request.prompt);

      const model = selectModel(request);

      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: getSystemPrompt(
            request.mode || MessageMode.GENERATE,
            hasImages,
            hasText,
            request.regenerate,
            request.regenerate ? request.prompt : undefined,
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
          content: `Conversation history:\n${contextMessage}`,
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

      const response = await openai.chat.completions.create({
        model,
        messages,
        max_tokens: config.openai.maxTokens,
        temperature: config.openai.temperature,
        response_format: {type: 'json_object'},
      });

      const text = response.choices[0]?.message?.content || '';
      if (!text) throw new Error('Empty response from OpenAI');

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

// 💡 Prompt selection logic
function getSystemPrompt(
  mode: MessageMode,
  hasImages: boolean,
  hasText: boolean,
  regenerate?: boolean,
  previousMessage?: string,
): string {
  const imageOnlyPrompt = `This is a dating app screenshot. The user is replying to the match. If this is the first message, craft a great opener. Otherwise, keep the thread going naturally.${
    regenerate && previousMessage
      ? `\n\nGenerate a new message that is different from this previous message:\n${previousMessage}`
      : ''
  }

Guidelines:
1. Keep it natural and conversational
2. Focus on one or two things, not everything
3. No em dashes (—)
4. Short and charming
5. Don't be boring${
    regenerate
      ? '\n6. Make sure your response is different from the previous message'
      : ''
  }

Respond in this JSON format:
{
  "summary": "Summary of what you see in the screenshot",
  "message": "Your crafted response"
}`;

  const generatePrompt = `You are a helpful AI dating coach. Generate a message for the user based on the conversation history and prompt.

Guidelines:
1. Match the user's desired tone (flirty, sincere, etc.)
2. Use prior context to maintain flow
3. No em dashes (—), keep it short and clever
4. Don't overanalyze — pick one or two hooks max${
    regenerate && previousMessage
      ? '\n5. Generate a new message that is different from this previous message:\n' +
        previousMessage
      : ''
  }

Respond in this JSON format:
{
  "summary": "Conversation summary",
  "message": "Your suggested message"
}`;

  const coachPrompt = `You're a dating coach. Provide feedback to the user about their chat.

Guidelines:
1. Focus on tone, clarity, and engagement
2. Call out what's working and what isn't
3. Keep advice short and actionable

Respond in this JSON format:
{
  "summary": "Brief feedback summary",
  "message": "Your coaching feedback"
}`;

  logger.debug('getSystemPrompt called with', {
    mode,
    hasImages,
    hasText,
    regenerate,
    previousMessage,
    useImagePrompt: hasImages && (regenerate || !hasText),
    selectedPrompt:
      mode === MessageMode.COACH
        ? 'coachPrompt'
        : hasImages && (regenerate || !hasText)
        ? 'imageOnlyPrompt'
        : 'generatePrompt',
    promptLength:
      mode === MessageMode.COACH
        ? coachPrompt.length
        : hasImages && (regenerate || !hasText)
        ? imageOnlyPrompt.length
        : generatePrompt.length,
  });

  if (mode === MessageMode.COACH) return coachPrompt;
  if (hasImages && (regenerate || !hasText)) return imageOnlyPrompt;
  return generatePrompt;
}
