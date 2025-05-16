import {Request, Response} from 'express';
import {getMessageRepository} from '../db/repositories';
import {Database} from '../db/types';
import {createGeminiService} from '../services/geminiService';
import {createMessageLimitService} from '../services/messageLimitService';
import {createOpenAIService} from '../services/openaiService';
import {MessageMode, MessageRole, MessageType} from '../types/enums';
import {loadConversation} from '../utils/conversationUtils';
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
    const base64Part = image.split(',')[1] || '';
    return `data:image/...;base64,${base64Part.substring(
      0,
      20,
    )}...${base64Part.substring(base64Part.length - 20)}`;
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

export const createReplyController = async (db: Database) => {
  const messageLimitService = createMessageLimitService(db);
  const openaiService = createOpenAIService();
  const geminiService = createGeminiService();
  const messageRepository = getMessageRepository(db);

  const generateReplyHandler = async (req: Request, res: Response) => {
    const {prompt, images, userId, matchId, skipRateLimiting} = req.body;

    // 1. Validate prompt
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return res.status(400).json({error: 'Prompt is required.'});
    }

    // Main logic as a promise
    const mainLogic = (async () => {
      logger.debug('Generating reply - request payload', {
        userId,
        matchId,
        hasImages: images?.length > 0,
        skipRateLimiting,
        prompt,
        imageCount: images?.length,
        sandboxMode: process.env.NODE_ENV !== 'production',
        images: images?.map(truncateImageData),
      });

      let messageLimits = null;
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
      const user = await db.getUser(userId);
      logger.debug('ReplyController: user lookup', {userId, user});
      if (!user) {
        logger.error('User not found in generateReplyHandler', {userId, user});
        return res.status(404).json({error: 'User not found'});
      }

      // Load conversation history for the specified match if matchId is provided
      const conversationHistory = matchId
        ? await loadConversation(userId, matchId, user.plan)
        : [];

      // 2. Check if match exists (for message errors test)
      if (matchId) {
        const match = await db.getMatchById(matchId);
        if (!match) {
          return res.status(404).json({error: 'Match not found'});
        }
      }

      logger.debug('Conversation history loaded', {
        userId,
        matchId,
        userPlan: user.plan,
        historyLength: conversationHistory.length,
        history: conversationHistory.map(msg => ({
          role: msg.role,
          contentLength: msg.content.length,
          timestamp: msg.timestamp,
        })),
      });

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

      logger.debug('Context message prepared', {
        userId,
        matchId,
        hasContext: !!contextMessage,
        contextLength: contextMessage.length,
        hasAssistantMessages: !!previousAssistantMessages,
        hasSummaries: !!previousSummaries,
      });

      // Always use OpenAI service
      const service = 'openai';
      logger.debug('Using AI service', {
        service,
        hasImages: images?.length > 0,
        imageCount: images?.length,
        requestedModel: req.body.model,
      });

      const response =
        service === 'openai'
          ? await openaiService.generateReply({
              prompt,
              images: images || [],
              userId,
              matchId,
              deleteAfterResponse: false,
              model: req.body.model,
            })
          : await geminiService.generateReply({
              prompt,
              images: [],
              userId,
              matchId,
              deleteAfterResponse: false,
            });

      logger.debug('AI service response', {
        userId,
        matchId,
        service,
        hasError: !!response.error,
        errorType: response.type,
        replyLength: response.reply?.length,
        summaryLength: response.summary?.length,
        usage: response.usage,
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
          limits: messageLimits,
        });
      }

      // Increment message count after successful generation
      const success = await messageLimitService.incrementMessageCount(userId);
      if (!success) {
        logger.warn('Failed to increment message count', {userId});
        return res.status(500).json({
          error: 'Failed to update message count',
          type: 'MESSAGE_COUNT_ERROR',
          limits: messageLimits,
        });
      }

      // Save the message using the repository
      const timestamp = new Date().toISOString();
      await messageRepository.createMessage(userId, matchId, {
        role: MessageRole.ASSISTANT,
        content: response.reply,
        timestamp,
        type: MessageType.TEXT,
        mode: MessageMode.GENERATE,
        used: true,
      });

      // Save the summary if it exists
      if (response.summary) {
        await messageRepository.createMessage(userId, matchId, {
          role: MessageRole.SYSTEM,
          content: response.summary,
          timestamp,
          type: MessageType.SUMMARY,
          mode: MessageMode.GENERATE,
          used: true,
        });
      }

      // Save screenshots if they exist
      if (images?.length > 0) {
        for (const image of images) {
          await messageRepository.createScreenshot(userId, matchId, {
            imageData: image,
            timestamp,
          });
        }
      }

      logger.info('Reply generated successfully', {
        userId,
        matchId,
        replyLength: response.reply.length,
      });

      // Get updated message limits
      const updatedLimits = await messageLimitService.getMessageLimits(userId);

      if (res.headersSent) return;

      return res.status(200).json({
        reply: response.reply,
        summary: response.summary,
        usage: response.usage,
        limits: updatedLimits,
      });
    })();

    // Handle any errors in the main logic
    mainLogic.catch(error => {
      logger.error('Error in generateReplyHandler', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      if (res.headersSent) return;

      res.status(500).json({
        error: 'An unexpected error occurred',
        type: 'UNKNOWN_ERROR',
      });
    });
  };

  return {
    generateReplyHandler,
  };
};
