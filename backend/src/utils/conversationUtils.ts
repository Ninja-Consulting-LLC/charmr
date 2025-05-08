import {getDatabase} from '../db';
import {SubscriptionTier} from '../types/enums';
import logger from '../utils/logger';

export interface Message {
  id: number;
  userId: string;
  matchId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export async function loadConversation(
  userId: string,
  matchId?: string,
  userPlan: SubscriptionTier = SubscriptionTier.FREE,
): Promise<Message[]> {
  try {
    const db = await getDatabase();

    // For free users, only load messages with the special free-user matchId
    if (userPlan === SubscriptionTier.FREE) {
      return await db.getMessages(userId, 'free-user');
    }

    // For pro users, only load messages with a valid matchId
    if (!matchId) {
      return [];
    }

    return await db.getMessages(userId, matchId);
  } catch (error) {
    logger.error('Error loading conversation:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId,
      matchId,
    });
    return [];
  }
}

export async function saveMessage(
  userId: string,
  matchId: string | undefined,
  message: Omit<Message, 'id' | 'userId' | 'matchId'>,
): Promise<Message> {
  try {
    const db = await getDatabase();
    const user = await db.getUser(userId);

    // For free users, use a special matchId
    if (user?.plan === SubscriptionTier.FREE) {
      matchId = 'free-user';
    }

    // For pro users, ensure we have a valid matchId
    if (user?.plan === SubscriptionTier.PRO && !matchId) {
      throw new Error('MatchId is required for pro users');
    }

    // Ensure we have a valid timestamp
    const timestamp = message.timestamp || new Date().toISOString();

    const savedMessage = await db.saveMessage(userId, matchId || 'free-user', {
      ...message,
      timestamp,
    });

    // If this is a user message, increment the message count
    if (message.role === 'user') {
      await db.incrementMessageCount(userId);
    }

    logger.info('Message saved successfully:', {
      userId,
      matchId,
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

export async function appendConversation(
  userId: string,
  matchId: string | undefined,
  summary: string,
  assistantMessage: string,
): Promise<Message> {
  const timestamp = new Date().toISOString();

  logger.info('Saving conversation:', {
    userId,
    matchId,
    summary,
    assistantMessage,
  });

  // Save the summary as a system message if it exists
  if (summary) {
    await saveMessage(userId, matchId, {
      role: 'system',
      content: summary,
      timestamp,
    });
  }

  // Save the assistant message and return it
  return await saveMessage(userId, matchId, {
    role: 'assistant',
    content: assistantMessage,
    timestamp,
  });
}

export async function saveUserMessage(
  userId: string,
  matchId: string | undefined,
  content: string,
): Promise<Message> {
  const timestamp = new Date().toISOString();

  // Save the user message (incrementMessageCount is now handled in saveMessage)
  return await saveMessage(userId, matchId, {
    role: 'user',
    content,
    timestamp,
  });
}
