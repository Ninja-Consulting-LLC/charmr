import {Request, Response} from 'express';
import {Database} from '../db/types';
import logger from '../utils/logger';

export const checkSchemaHealth = async (
  req: Request,
  res: Response,
  db: Database,
) => {
  try {
    const issues: string[] = [];

    // Get all messages
    const messages = await db.getMessages('', '');

    // Check message counts by type
    const typeCounts = messages.reduce((acc, msg) => {
      acc[msg.type] = (acc[msg.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Check used vs unused messages
    const usedCount = messages.filter(m => m.used).length;
    const unusedCount = messages.filter(m => !m.used).length;

    // Check for null or missing matchIds
    const messagesWithMissingMatchId = messages.filter(m => !m.matchId);
    if (messagesWithMissingMatchId.length > 0) {
      issues.push(
        `Found ${messagesWithMissingMatchId.length} messages with missing matchId`,
      );
    }

    // Check summary messages have valid replyTo
    const summaryMessages = messages.filter(m => m.type === 'summary');
    const invalidSummaryMessages = summaryMessages.filter(m => {
      if (!m.replyTo) return true;
      const referencedMessage = messages.find(msg => msg.id === m.replyTo);
      return !referencedMessage;
    });
    if (invalidSummaryMessages.length > 0) {
      issues.push(
        `Found ${invalidSummaryMessages.length} summary messages with invalid replyTo references`,
      );
    }

    // Check message ordering
    const sortedMessages = [...messages].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
    const isOrdered = messages.every(
      (msg, i) => msg.id === sortedMessages[i].id,
    );
    if (!isOrdered) {
      issues.push('Messages are not properly ordered by timestamp');
    }

    // Check replyTo references
    const messagesWithReplyTo = messages.filter(m => m.replyTo);
    const invalidReplyTo = messagesWithReplyTo.filter(m => {
      const referencedMessage = messages.find(msg => msg.id === m.replyTo);
      return !referencedMessage;
    });
    if (invalidReplyTo.length > 0) {
      issues.push(
        `Found ${invalidReplyTo.length} messages with invalid replyTo references`,
      );
    }

    return res.status(200).json({
      success: issues.length === 0,
      issues,
      stats: {
        messageCounts: {
          byType: typeCounts,
          used: usedCount,
          unused: unusedCount,
          total: messages.length,
        },
      },
    });
  } catch (error) {
    logger.error('Failed to check schema health', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return res.status(500).json({
      success: false,
      issues: [
        'Failed to check schema health: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
      ],
    });
  }
};
