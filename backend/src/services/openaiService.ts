import OpenAI from 'openai';
import {config} from '../config/config';
import {getDatabase} from '../db';
import {GenerateReplyRequest, GenerateReplyResponse} from '../types';
import {
  ErrorType,
  MessageMode,
  MessageStyle,
  SubscriptionTier,
} from '../types/enums';
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
        ? await loadConversation(
            request.userId,
            request.matchId,
            user?.plan || SubscriptionTier.FREE,
          )
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
          content: getSystemPrompt(
            request.mode || MessageMode.GENERATE,
            request.style,
          ),
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

        // Calculate costs
        const costBreakdown = calculateCost(
          request.model || config.openai.model,
          {
            prompt_tokens: response.usage?.prompt_tokens || 0,
            completion_tokens: response.usage?.completion_tokens || 0,
            total_tokens: response.usage?.total_tokens || 0,
            image_count: request.images?.length || 0,
          },
        );

        // Save the message cost
        await db.saveMessageCost(savedMessage.id, {
          model: request.model || config.openai.model,
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
          inputCost: costBreakdown.inputCost,
          outputCost: costBreakdown.outputCost,
          totalCost: costBreakdown.totalCost,
          timestamp,
        });
      }

      return {
        reply,
        summary,
        usage: response.usage,
        mode: request.mode || MessageMode.GENERATE,
        style: request.style,
      };
    } catch (error: any) {
      logger.error('OpenAI API error', {
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

function getSystemPrompt(mode: MessageMode, style?: MessageStyle): string {
  const generatePrompt = `You are a helpful dating coach. Consider the conversation history and context when generating responses.

Guidelines:
1. Keep responses natural and conversational
2. Match the tone and style requested by the user
3. Show genuine interest in the match's interests and experiences
4. Keep responses concise but engaging
5. Avoid being overly aggressive or inappropriate
6. Use the conversation history to maintain context and build rapport

${
  style
    ? `Tone: Write in a ${style} style that is engaging and appropriate.`
    : ''
}

Respond in the following JSON format:
{
  "summary": "A brief summary of the match's interests and conversation style based on the history",
  "message": "Your response"
}`;

  const coachPrompt = `You are a dating coach providing analysis and feedback. Consider the conversation history and context when providing insights.

Guidelines:
1. Be constructive and specific in your feedback
2. Focus on communication patterns and effectiveness
3. Identify both strengths and areas for improvement
4. Provide actionable suggestions
5. Maintain a supportive and professional tone
6. Consider emotional intelligence and awareness

Respond in the following JSON format:
{
  "summary": "A brief analysis of the conversation dynamics and patterns",
  "message": "Your detailed feedback and suggestions"
}`;

  const modeSpecificPrompts = {
    [MessageMode.GENERATE]: `Your task is to help users craft engaging and appropriate responses to their matches. ${generatePrompt}`,
    [MessageMode.COACH]: `Your task is to analyze the conversation like a dating coach and provide constructive advice. Focus on:
- Communication patterns and effectiveness
- Areas for improvement
- Positive aspects to maintain
- Specific suggestions for better engagement
${coachPrompt}`,
  };

  return modeSpecificPrompts[mode];
}
