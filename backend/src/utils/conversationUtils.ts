import {getDatabase} from '../db';
import {getMessageRepository} from '../db/repositories';
import {Message} from '../db/types';
import {
  MessageMode,
  MessageRole,
  MessageType,
  SubscriptionTier,
} from '../types/enums';
import logger from '../utils/logger';

export type {Message} from '../db/types';

export const loadConversation = async (
  userId: string,
  matchId: string,
  userPlan: SubscriptionTier,
): Promise<Message[]> => {
  try {
    const db = await getDatabase();
    const messageRepository = getMessageRepository(db);

    // Get messages for the match
    const {messages} = await messageRepository.getMessagesByMatch(
      userId,
      matchId,
    );

    // Sort messages by timestamp
    return messages.sort((a: Message, b: Message) => {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });
  } catch (error) {
    logger.error('Failed to load conversation', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId,
      matchId,
    });
    throw error;
  }
};

export const appendConversation = async (
  userId: string,
  matchId: string,
  summary: string,
  reply: string,
  images?: string[],
  prompt?: string,
): Promise<Message> => {
  try {
    const db = await getDatabase();
    const messageRepository = getMessageRepository(db);

    // Start with current timestamp for this conversation set
    let baseTimestamp = Date.now();

    // Save user message first (either text, images, or both)
    if (images && images.length > 0) {
      // Save screenshots with or without prompt
      for (let i = 0; i < images.length; i++) {
        const timestamp = new Date(baseTimestamp + i * 1000).toISOString();
        await messageRepository.createMessage(userId, matchId, {
          role: MessageRole.USER,
          type: MessageType.IMAGE,
          mode: MessageMode.GENERATE,
          content: prompt || '',
          timestamp,
          imageData: images[i],
        });
      }
      baseTimestamp += images.length * 1000;
    } else if (prompt) {
      // Save regular text message
      const timestamp = new Date(baseTimestamp).toISOString();
      await messageRepository.createMessage(userId, matchId, {
        role: MessageRole.USER,
        type: MessageType.TEXT,
        mode: MessageMode.GENERATE,
        content: prompt,
        timestamp,
      });
      baseTimestamp += 1000;
    }

    // Save the assistant reply after user message(s)
    const replyTimestamp = new Date(baseTimestamp).toISOString();
    const assistantMessage = await messageRepository.createMessage(
      userId,
      matchId,
      {
        role: MessageRole.ASSISTANT,
        type: MessageType.TEXT,
        mode: MessageMode.GENERATE,
        content: reply,
        timestamp: replyTimestamp,
      },
    );
    baseTimestamp += 1000;

    // Save the summary message after the assistant's reply
    if (summary) {
      const summaryTimestamp = new Date(baseTimestamp).toISOString();
      await messageRepository.createMessage(userId, matchId, {
        role: MessageRole.SYSTEM,
        type: MessageType.SUMMARY,
        mode: MessageMode.GENERATE,
        content: summary,
        timestamp: summaryTimestamp,
        replyTo:
          typeof assistantMessage.id === 'string'
            ? parseInt(assistantMessage.id, 10)
            : assistantMessage.id,
      });
    }

    return assistantMessage;
  } catch (error) {
    logger.error('Failed to append conversation', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId,
      matchId,
    });
    throw error;
  }
};
