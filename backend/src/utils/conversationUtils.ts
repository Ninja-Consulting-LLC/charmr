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

    // Fetch the latest user message timestamp for this match
    const {messages} = await messageRepository.getMessagesByMatch(
      userId,
      matchId,
    );
    const latestUserMsg = messages
      .filter((m: Message) => m.role === MessageRole.USER)
      .sort(
        (a: Message, b: Message) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )[0];

    // Use a timestamp just after the latest user message
    let baseTimestamp = latestUserMsg
      ? new Date(latestUserMsg.timestamp).getTime()
      : Date.now();

    // Save user message first (either text, images, or both)
    if (images && images.length > 0) {
      // Save screenshots with or without prompt
      for (let i = 0; i < images.length; i++) {
        const timestamp = new Date(baseTimestamp + i + 1).toISOString();
        await messageRepository.createMessage(userId, matchId, {
          role: MessageRole.USER,
          type: MessageType.IMAGE,
          mode: MessageMode.GENERATE,
          content: prompt || '',
          timestamp,
          imageData: images[i],
        });
      }
      baseTimestamp += images.length;
    } else if (prompt) {
      // Save regular text message
      const timestamp = new Date(baseTimestamp + 1).toISOString();
      await messageRepository.createMessage(userId, matchId, {
        role: MessageRole.USER,
        type: MessageType.TEXT,
        mode: MessageMode.GENERATE,
        content: prompt,
        timestamp,
      });
      baseTimestamp += 1;
    }

    // Save the assistant reply after user message(s)
    const replyTimestamp = new Date(baseTimestamp + 1).toISOString();
    return await messageRepository.createMessage(userId, matchId, {
      role: MessageRole.ASSISTANT,
      type: MessageType.TEXT,
      mode: MessageMode.GENERATE,
      content: reply,
      timestamp: replyTimestamp,
    });
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
