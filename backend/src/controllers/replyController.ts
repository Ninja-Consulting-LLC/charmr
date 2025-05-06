import {Request, Response} from 'express';
import {getDatabase} from '../db';
import {createGeminiService} from '../services/geminiService';
import {createMessageLimitService} from '../services/messageLimitService';
import {createOpenAIService} from '../services/openaiService';
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
  const openaiService = createOpenAIService();
  const geminiService = createGeminiService();

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

      // Get user's plan
      const db = await getDatabase();
      const user = await db.getUser(userId);
      if (!user) {
        return res.status(404).json({error: 'User not found'});
      }

      // Load conversation history for the specified match if matchId is provided
      const conversationHistory = matchId
        ? await loadConversation(userId, matchId, user.plan)
        : [];

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

      // Use Gemini for text-only requests, OpenAI for requests with images
      const response =
        images?.length > 0
          ? await openaiService.generateReply({
              prompt,
              images,
              userId,
              matchId,
              deleteAfterResponse: false,
            })
          : await geminiService.generateReply({
              prompt,
              images: [],
              userId,
              matchId,
              deleteAfterResponse: false,
            });

      if (response.error) {
        logger.error('Failed to generate reply', {
          userId,
          matchId,
          error: response.error,
        });
        return res.status(500).json({
          error: response.error,
          type: 'GENERATION_ERROR',
        });
      }

      // Save the system message (summary)
      const savedSystemMessage = await saveMessage(userId, matchId, {
        role: 'system',
        content: response.summary || '',
        timestamp: new Date().toISOString(),
      });

      // Save the assistant's reply
      const savedAssistantMessage = await saveMessage(userId, matchId, {
        role: 'assistant',
        content: response.reply,
        timestamp: new Date().toISOString(),
      });

      logger.info('Reply generated and saved successfully', {
        userId,
        matchId,
        replyLength: response.reply.length,
        systemMessageId: savedSystemMessage.id,
        assistantMessageId: savedAssistantMessage.id,
      });

      return res.json({
        reply: response.reply,
        limits: messageLimits,
      });
    } catch (error) {
      logger.error('Error generating reply', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        userId,
        matchId,
      });
      return res.status(500).json({
        error: 'Failed to generate reply',
        type: 'GENERATION_ERROR',
      });
    }
  };

  return {
    generateReplyHandler,
  };
};
