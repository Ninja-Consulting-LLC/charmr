import {getDatabase} from '../db';
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
  matchId: string,
): Promise<Message[]> {
  try {
    const db = await getDatabase();
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
  matchId: string,
  message: Omit<Message, 'id' | 'userId' | 'matchId'>,
): Promise<Message> {
  try {
    const db = await getDatabase();
    const savedMessage = await db.saveMessage(userId, matchId, message);
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
  matchId: string,
  summary: string,
  assistantMessage: string,
): Promise<void> {
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

  // Save the assistant message
  await saveMessage(userId, matchId, {
    role: 'assistant',
    content: assistantMessage,
    timestamp,
  });
}
