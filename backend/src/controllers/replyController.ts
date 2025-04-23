import {Request, Response} from 'express';
import {createMessageLimitService} from '../services/messageLimitService';
import logger from '../utils/logger';

export const createReplyController = async () => {
  const messageLimitService = await createMessageLimitService();

  const generateReplyHandler = async (req: Request, res: Response) => {
    const {prompt, images, userId, matchId} = req.body;

    logger.debug('Generating reply', {
      userId,
      matchId,
      hasImages: images?.length > 0,
    });

    try {
      // Check message limits
      const messageLimits = await messageLimitService.getMessageLimits(userId);
      const canSendMessage =
        messageLimits.dailyMessagesUsed < messageLimits.dailyMessageLimit ||
        messageLimits.extraMessages > 0;

      if (!canSendMessage) {
        logger.warn('Message limit reached', {userId, messageLimits});
        return res.status(403).json({
          error: 'Message limit reached',
          limits: messageLimits,
          type: 'MESSAGE_LIMIT',
        });
      }

      // Increment message count before generating reply
      await messageLimitService.incrementMessageCount(userId);

      // TODO: Implement OpenAI integration
      const reply = 'This is a placeholder reply';

      logger.info('Reply generated successfully', {
        userId,
        matchId,
        replyLength: reply.length,
      });

      // Return updated limits with the response
      const updatedLimits = await messageLimitService.getMessageLimits(userId);
      res.json({
        reply,
        limits: updatedLimits,
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
