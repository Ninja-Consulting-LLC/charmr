import {Request, Response} from 'express';
import {config} from '../config/config';
import {getDatabase} from '../db';
import {getMessageRepository} from '../db/repositories';
import {Database} from '../db/types';
import {createGeminiService} from '../services/geminiService';
import {createMessageLimitService} from '../services/messageLimitService';
import {createOpenAIService} from '../services/openaiService';
import {createSummaryService} from '../services/summaryService';
import {MessageMode} from '../types/enums';
import {appendConversation, loadConversation} from '../utils/conversationUtils';
import {calculateCost} from '../utils/costUtils';
import logger from '../utils/logger';
import {sanitizeImage} from '../utils/sanitizeImage';

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

export const createReplyController = async (db: Database) => {
  const messageLimitService = createMessageLimitService(db);
  const openaiService = createOpenAIService();
  // const geminiService = createGeminiService();
  const messageRepository = getMessageRepository(db);
  const summaryService = createSummaryService(db);

  const generateReplyHandler = async (req: Request, res: Response) => {
    try {
      const {prompt, images, userId, matchId, skipRateLimiting} = req.body;

      // 1. Validate prompt
      if (
        (!prompt || typeof prompt !== 'string' || prompt.trim() === '') &&
        (!images || images.length === 0)
      ) {
        return res.status(400).json({error: 'Prompt is required.'});
      }

      // Main logic
      logger.debug('Generating reply - request payload', {
        userId,
        hasImages: images?.length > 0,
        prompt,
        imageCount: images?.length,
        mode: req.body.mode,
        regenerate: req.body.regenerate,
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
        logger.error('User not found in generateReplyHandler', {
          userId,
          user,
        });
        return res.status(404).json({error: 'User not found'});
      }

      // Sanitize images if present
      let sanitizedImages: string[] = [];
      let storedImages: string[] = [];
      if (images?.length > 0) {
        try {
          const imagePromises = images.map(async (base64Image: string) => {
            try {
              // Convert base64 to buffer
              const base64Data = base64Image.split(',')[1];
              const imageBuffer = Buffer.from(base64Data, 'base64');

              // Sanitize image for AI service (strip metadata)
              const aiSanitized = await sanitizeImage(imageBuffer, {
                stripMetadata: true,
              });

              // Sanitize image for storage (preserve metadata)
              const storedSanitized = await sanitizeImage(imageBuffer, {
                stripMetadata: false,
              });

              return {
                aiImage: `data:image/png;base64,${aiSanitized.buffer.toString(
                  'base64',
                )}`,
                storedImage: `data:image/png;base64,${storedSanitized.buffer.toString(
                  'base64',
                )}`,
              };
            } catch (error) {
              logger.error('Error sanitizing image:', error);
              throw new Error(
                'Failed to process image. Please try again with a different image.',
              );
            }
          });

          const results = await Promise.all(imagePromises);
          sanitizedImages = results.map(r => r.aiImage);
          storedImages = results.map(r => r.storedImage);
        } catch (error) {
          logger.error('Error processing images:', error);
          return res.status(400).json({
            error:
              error instanceof Error
                ? error.message
                : 'Failed to process images',
            type: 'IMAGE_PROCESSING_ERROR',
          });
        }
      }

      // Load conversation history for the specified match if matchId is provided
      const conversationHistory = matchId
        ? await loadConversation(userId, matchId, user.plan)
        : [];

      // 2. Check if match exists (for message errors test)
      if (matchId) {
        const match = await db.getMatchById(userId, matchId);
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

      // Get the match summary if we have a matchId
      let matchSummary: string | undefined;
      if (matchId) {
        matchSummary = await summaryService.getMatchSummary(userId, matchId);
      }

      // Determine which AI service to use
      const service = config.ai.defaultService;

      logger.debug('Using AI service', {
        service,
        hasImages: sanitizedImages.length > 0,
        imageCount: sanitizedImages.length,
        requestedModel: req.body.model,
      });

      const response =
        service === 'openai'
          ? await openaiService.generateReply({
              prompt,
              images: sanitizedImages,
              userId,
              matchId,
              model: req.body.model,
              mode: req.body.mode,
              regenerate: req.body.regenerate,
              previousMessage: req.body.regenerate ? prompt : undefined,
              matchSummary,
            })
          : await createGeminiService().generateReply({
              prompt,
              images: [],
              userId,
              matchId,
              mode: req.body.mode,
              regenerate: req.body.regenerate,
              previousMessage: req.body.regenerate ? prompt : undefined,
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

      // Save the message and its costs if not deleting after response
      if (!req.body.deleteAfterResponse) {
        const db = await getDatabase();
        const timestamp = new Date().toISOString();

        // Save the message and its costs
        const savedMessage = await appendConversation(
          userId,
          matchId,
          response.reply,
          storedImages, // Use images with preserved metadata for storage
          prompt,
          req.body.mode || MessageMode.GENERATE,
          response.promptVariant,
        );

        // Save the summary if we have one and a matchId
        if (response.summary && matchId) {
          await summaryService.updateMatchSummary(
            userId,
            matchId,
            response.summary,
          );
        }

        // Calculate costs
        const costBreakdown = calculateCost(
          req.body.model || config.openai.model,
          {
            prompt_tokens: response.usage?.prompt_tokens || 0,
            completion_tokens: response.usage?.completion_tokens || 0,
            total_tokens: response.usage?.total_tokens || 0,
            image_count: sanitizedImages.length || 0,
          },
        );

        // Save message cost
        await db.saveMessageCost(savedMessage.id, {
          model: req.body.model || config.openai.model,
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
          inputCost: costBreakdown.inputCost,
          outputCost: costBreakdown.outputCost,
          totalCost: costBreakdown.totalCost,
          timestamp: new Date().toISOString(),
        });
      }

      logger.info('Reply generated successfully', {
        userId,
        matchId,
        replyLength: response.reply.length,
      });

      // Increment message count after successful assistant reply
      const success = await messageLimitService.incrementMessageCount(userId);
      if (!success) {
        logger.warn('Failed to increment message count', {userId});
        return res.status(500).json({
          error: 'Failed to update message count',
          type: 'MESSAGE_COUNT_ERROR',
          limits: messageLimits,
        });
      }

      // Get updated message limits
      const updatedLimits = await messageLimitService.getMessageLimits(userId);

      if (res.headersSent) return;

      return res.status(200).json({
        reply: response.reply,
        summary: response.summary,
        usage: response.usage,
        limits: updatedLimits,
      });
    } catch (error) {
      console.error('Error generating reply:', error);
      return res.status(500).json({error: 'Failed to generate reply'});
    }
  };

  return {
    generateReplyHandler,
  };
};
