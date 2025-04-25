import {Request, Response} from 'express';
import {getDatabase} from '../db';
import {createMessageLimitService} from '../services/messageLimitService';
import {SubscriptionTier} from '../types/enums';
import {loadConversation, saveMessage} from '../utils/conversationUtils';
import logger from '../utils/logger';

interface ChatGptImage {
  type: 'image_url';
  image_url: {
    url: string;
    detail: 'auto' | 'low' | 'high';
  };
}

// Helper function to truncate image data
const truncateImageData = (image: string): string => {
  if (!image) return '';
  // For base64 images, show first 20 chars and last 20 chars
  if (image.startsWith('data:')) {
    return `${image.substring(0, 20)}...${image.substring(image.length - 20)}`;
  }
  // For URLs, just show the first 50 chars
  return image.substring(0, 50) + '...';
};

// Dating coach instructions
const DATING_COACH_INSTRUCTIONS = `You are a helpful dating assistant. Your task is to help users craft engaging and appropriate responses to their matches. Consider the conversation history and context when generating responses.

Guidelines:
1. Keep responses natural and conversational
2. Match the tone and style requested by the user
3. Show genuine interest in the match's interests and experiences
4. Keep responses concise but engaging
5. Avoid being overly aggressive or inappropriate
6. Use the conversation history to maintain context and build rapport

Format your response as follows:
<summary>
A brief summary of the match's interests and conversation style based on the history
</summary>
<message>
Your suggested reply to the match
</message>`;

export const createReplyController = async () => {
  const messageLimitService = await createMessageLimitService();

  const generateReplyHandler = async (req: Request, res: Response) => {
    const {prompt, images, userId, matchId, skipRateLimiting} = req.body;

    logger.debug('Generating reply - request payload', {
      userId,
      matchId,
      hasImages: images?.length > 0,
      skipRateLimiting,
      prompt,
      imageCount: images?.length,
      sandboxMode: process.env.NODE_ENV !== 'production',
      truncatedImages: images?.map(truncateImageData),
    });

    try {
      let messageLimits = null;

      // Check message limits unless skipping rate limiting
      if (!skipRateLimiting) {
        messageLimits = await messageLimitService.getMessageLimits(userId);
        const canSendMessage =
          messageLimits.dailyMessagesUsed < messageLimits.dailyMessageLimit ||
          messageLimits.extraMessages > 0;

        if (!canSendMessage) {
          logger.warn('Message limit reached', {userId, messageLimits});
          return res.status(429).json({
            error: 'Message limit reached',
            limits: messageLimits,
            type: 'MESSAGE_LIMIT',
          });
        }
      }

      // Increment message count (unless skipping rate limiting)
      if (!skipRateLimiting) {
        const incrementSuccess =
          await messageLimitService.incrementMessageCount(userId);
        if (!incrementSuccess) {
          logger.error('Failed to increment message count', {userId});
          return res.status(500).json({
            error: 'Failed to process message',
            message: 'Could not update message count',
          });
        }
        // Get updated limits
        messageLimits = await messageLimitService.getMessageLimits(userId);
      }

      // Get user's plan
      const db = await getDatabase();
      const user = await db.getUser(userId);
      if (!user) {
        return res.status(404).json({error: 'User not found'});
      }

      // For premium/pro users, matchId is required
      if (user.plan !== SubscriptionTier.FREE && !matchId) {
        return res.status(400).json({
          error: 'Match selection is required for Premium and Pro users',
          type: 'MATCH_SELECTION_REQUIRED',
        });
      }

      // Load conversation history for the specified match
      const conversationHistory = await loadConversation(
        userId,
        matchId,
        user.plan,
      );

      // Extract all assistant messages and summaries
      const previousAssistantMessages = conversationHistory
        .filter(msg => msg.role === 'assistant')
        .map(msg => msg.content)
        .join('\n');

      const previousSummaries = conversationHistory
        .filter(msg => msg.role === 'system')
        .map(msg => msg.content)
        .join('\n');

      const contextMessage =
        previousAssistantMessages || previousSummaries
          ? `Here is the conversation history for context:\n\nPrevious Summaries:\n${previousSummaries}\n\nPrevious Messages:\n${previousAssistantMessages}`
          : '';

      // Log ChatGPT payload
      const chatGptPayload = {
        messages: [
          {
            role: 'system',
            content: `${DATING_COACH_INSTRUCTIONS}\n\n${contextMessage}`,
          },
          {
            role: 'user',
            content: [
              {type: 'text', text: prompt},
              ...(images?.map(
                (img: string): ChatGptImage => ({
                  type: 'image_url',
                  image_url: {url: img, detail: 'auto'},
                }),
              ) || []),
            ],
          },
        ],
        model:
          process.env.NODE_ENV === 'production'
            ? 'gpt-4-vision-preview'
            : 'gpt-4',
        max_tokens: 500,
        temperature: 0.7,
      };

      // Create a truncated version of the payload for logging
      const truncatedPayload = {
        ...chatGptPayload,
        messages: chatGptPayload.messages.map(msg => ({
          ...msg,
          content: Array.isArray(msg.content)
            ? msg.content.map(content => ({
                ...content,
                image_url:
                  content.type === 'image_url'
                    ? {
                        url: truncateImageData(content.image_url.url),
                        detail: content.image_url.detail,
                      }
                    : undefined,
              }))
            : msg.content,
        })),
      };

      logger.debug('ChatGPT API request payload', {
        userId,
        matchId,
        payload: truncatedPayload,
        sandboxMode: process.env.NODE_ENV !== 'production',
      });

      // TODO: Implement OpenAI integration
      const reply =
        user.plan === SubscriptionTier.FREE
          ? "Hey! I'd love to get to know you better. What's your favorite way to spend a weekend? I'm always looking for new adventures and would love to hear about yours! 😊"
          : "That's such a cool photo! I love how adventurous you are. I'm actually planning a similar trip next month - maybe we could swap some tips? You seem like someone who knows how to make the most of every moment. What's the most memorable place you've visited? 🌍✨";
      const summary = 'This is a placeholder summary';

      // Log ChatGPT response
      logger.debug('ChatGPT API response', {
        userId,
        matchId,
        sandboxMode: process.env.NODE_ENV !== 'production',
        response: {
          reply,
          summary,
          usage: {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
          },
          model:
            process.env.NODE_ENV === 'production'
              ? 'gpt-4-vision-preview'
              : 'gpt-4',
        },
      });

      // Save the system message (summary)
      const savedSystemMessage = await saveMessage(userId, matchId, {
        role: 'system',
        content: summary,
        timestamp: new Date().toISOString(),
      });

      // Save the assistant's reply
      const savedAssistantMessage = await saveMessage(userId, matchId, {
        role: 'assistant',
        content: reply,
        timestamp: new Date().toISOString(),
      });

      logger.info('Reply generated and saved successfully', {
        userId,
        matchId,
        replyLength: reply.length,
        systemMessageId: savedSystemMessage.id,
        assistantMessageId: savedAssistantMessage.id,
      });

      res.json({
        reply,
        limits: messageLimits,
        messages: {
          system: savedSystemMessage,
          assistant: savedAssistantMessage,
        },
      });
    } catch (error) {
      logger.error('Failed to generate reply', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        userId,
        matchId,
      });
      res.status(500).json({
        error: 'Failed to generate reply',
        message:
          process.env.NODE_ENV === 'production'
            ? 'An unexpected error occurred'
            : error instanceof Error
            ? error.message
            : 'Unknown error',
      });
    }
  };

  return {
    generateReplyHandler,
  };
};
