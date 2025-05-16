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
    const messages = await messageRepository.getMessagesByMatch(
      userId,
      matchId,
    );

    // Sort messages by timestamp
    return messages.sort((a, b) => {
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
): Promise<Message> => {
  try {
    const db = await getDatabase();
    const messageRepository = getMessageRepository(db);
    const timestamp = new Date().toISOString();

    // Save the summary first
    if (summary) {
      await messageRepository.createMessage(userId, matchId, {
        role: MessageRole.SYSTEM,
        content: summary,
        timestamp,
      });
    }

    // Save the reply
    return await messageRepository.createMessage(userId, matchId, {
      role: MessageRole.ASSISTANT,
      content: reply,
      timestamp,
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

export async function saveMessage(
  userId: string,
  matchId: string | undefined,
  message: Omit<Message, 'id' | 'userId' | 'matchId'>,
): Promise<Message> {
  try {
    const db = await getDatabase();
    const user = await db.getUser(userId);

    // Use no-match-selected if matchId is not provided
    const finalMatchId = matchId || 'no-match-selected';

    // Ensure we have a valid timestamp
    const timestamp = message.timestamp || new Date().toISOString();

    const savedMessage = await db.saveMessage(userId, finalMatchId, {
      ...message,
      timestamp,
      type: message.type || 'text',
      mode: message.mode || 'generate',
      used: message.used ?? false,
    });

    // If this is a user message, increment the message count
    if (message.role === 'user') {
      await db.incrementMessageCount(userId);
    }

    logger.info('Message saved successfully:', {
      userId,
      matchId: finalMatchId,
      role: savedMessage.role,
      timestamp: savedMessage.timestamp,
    });
    return savedMessage;
  } catch (error) {
    logger.error('Error saving message:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId,
      matchId,
      message,
    });
    throw error;
  }
}

export async function saveUserMessage(
  userId: string,
  matchId: string | undefined,
  content: string,
): Promise<Message> {
  const timestamp = new Date().toISOString();

  // Save the user message (incrementMessageCount is now handled in saveMessage)
  return await saveMessage(userId, matchId, {
    role: MessageRole.USER,
    content,
    timestamp,
    type: MessageType.TEXT,
    mode: MessageMode.GENERATE,
    used: false,
  });
}
