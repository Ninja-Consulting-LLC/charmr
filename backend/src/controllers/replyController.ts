import {Request, Response} from 'express';
import {config} from '../config/config';
import {Database} from '../db/types';
import {processReplyImages} from './reply/processReplyImages';
import {createMessageLimitService} from '../services/messageLimitService';
import {createLlmProvider} from '../services/llm/llmProvider';
import {createSummaryService} from '../services/summaryService';
import {MessageMode} from '../types/enums';
import {appendConversation, loadConversation} from '../utils/conversationUtils';
import {calculateCost} from '../utils/costUtils';
import logger from '../utils/logger';

export const createReplyController = async (db: Database) => {
  const messageLimitService = createMessageLimitService(db);
  const llmProvider = createLlmProvider(db, config.ai.defaultService as 'openai' | 'gemini');
  const summaryService = createSummaryService(db);

  const generateReplyHandler = async (req: Request, res: Response) => {
    try {
      const {prompt, images, userId, matchId, skipRateLimiting} = req.body;

      if (
        (!prompt || typeof prompt !== 'string' || prompt.trim() === '') &&
        (!images || images.length === 0)
      ) {
        return res.status(400).json({error: 'Prompt is required.'});
      }

      logger.debug('Generating reply - request payload', {
        userId,
        hasImages: images?.length > 0,
        prompt,
        imageCount: images?.length,
        mode: req.body.mode,
        regenerate: req.body.regenerate,
      });

      if (process.env.CHARMR_E2E_FORCE_MESSAGE_LIMIT === 'true') {
        const messageLimits = await messageLimitService.getMessageLimits(userId);
        return res.status(429).json({
          error: 'Message limit reached',
          limits: messageLimits,
          type: 'MESSAGE_LIMIT',
        });
      }

      let messageLimits = null;
      if (!skipRateLimiting) {
        messageLimits = await messageLimitService.getMessageLimits(userId);
        const canSendMessage =
          messageLimits.dailyMessagesUsed < messageLimits.dailyMessageLimit ||
          messageLimits.extraMessages > 0;
        if (!canSendMessage) {
          logger.warning('Message limit reached', {userId, messageLimits});
          return res.status(429).json({
            error: 'Message limit reached',
            limits: messageLimits,
            type: 'MESSAGE_LIMIT',
          });
        }
      }

      const user = await db.getUser(userId);
      logger.debug('ReplyController: user lookup', {userId, user});
      if (!user) {
        logger.error('User not found in generateReplyHandler', {
          userId,
          user,
        });
        return res.status(404).json({error: 'User not found'});
      }

      if (process.env.CHARMR_E2E_STUB_LLM === 'true') {
        const incrementOk =
          await messageLimitService.incrementMessageCount(userId);
        if (!incrementOk) {
          const limits = await messageLimitService.getMessageLimits(userId);
          return res.status(429).json({
            error: 'Message limit reached',
            limits,
            type: 'MESSAGE_LIMIT',
          });
        }
        const updatedLimits = await messageLimitService.getMessageLimits(userId);
        return res.status(200).json({
          reply: '[E2E_STUB] Deterministic coach reply',
          limits: updatedLimits,
          mode: req.body.mode ?? MessageMode.GENERATE,
        });
      }

      let sanitizedImages: string[] = [];
      let storedImages: string[] = [];
      if (images?.length > 0) {
        try {
          const processed = await processReplyImages(images);
          sanitizedImages = processed.sanitizedForAi;
          storedImages = processed.storedWithMetadata;
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

      const conversationHistory = matchId
        ? await loadConversation(db, userId, matchId, user.plan)
        : [];

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

      let matchSummary: string | undefined;
      if (matchId) {
        matchSummary = await summaryService.getMatchSummary(userId, matchId);
      }

      const service = config.ai.defaultService as 'openai' | 'gemini';

      logger.debug('Using AI service', {
        service,
        hasImages: sanitizedImages.length > 0,
        imageCount: sanitizedImages.length,
        requestedModel: req.body.model,
      });

      const response = await llmProvider.generateReply({
        prompt,
        images: service === 'openai' ? sanitizedImages : [],
        userId,
        matchId,
        model: req.body.model,
        mode: req.body.mode,
        regenerate: req.body.regenerate,
        previousMessage: req.body.regenerate ? prompt : undefined,
        matchSummary,
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

      if (!req.body.deleteAfterResponse) {
        const timestamp = new Date().toISOString();

        const costBreakdown = calculateCost(
          req.body.model || config.openai.model,
          {
            prompt_tokens: response.usage?.prompt_tokens || 0,
            completion_tokens: response.usage?.completion_tokens || 0,
            total_tokens: response.usage?.total_tokens || 0,
            image_count: sanitizedImages.length || 0,
          },
        );

        await appendConversation(
          db,
          userId,
          matchId,
          response.reply,
          storedImages,
          prompt,
          req.body.mode || MessageMode.GENERATE,
          response.promptVariant,
          {
            model: req.body.model || config.openai.model,
            promptTokens: response.usage?.prompt_tokens || 0,
            completionTokens: response.usage?.completion_tokens || 0,
            totalTokens: response.usage?.total_tokens || 0,
            inputCost: costBreakdown.inputCost,
            outputCost: costBreakdown.outputCost,
            totalCost: costBreakdown.totalCost,
            costTimestamp: timestamp,
          },
        );

        if (response.summary && matchId) {
          await summaryService.updateMatchSummary(
            userId,
            matchId,
            response.summary,
          );
        }

        await db.updateUserCosts(userId, {
          totalCost: costBreakdown.totalCost,
          totalTokens: response.usage?.total_tokens || 0,
        });
      }

      logger.debug('Reply generated successfully', {
        userId,
        matchId,
        replyLength: response.reply.length,
      });

      const success = await messageLimitService.incrementMessageCount(userId);
      if (!success) {
        logger.warning('Failed to increment message count', {userId});
        return res.status(500).json({
          error: 'Failed to update message count',
          type: 'MESSAGE_COUNT_ERROR',
          limits: messageLimits,
        });
      }

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
