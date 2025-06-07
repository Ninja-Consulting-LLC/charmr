import {firebaseAdmin} from '../config/firebase-admin';
import logger from '../utils/logger';
import {Message} from './types';

export const getFirestore = () => {
  try {
    const firestore = firebaseAdmin.firestore();
    logger.info('Firestore initialized successfully');
    return firestore;
  } catch (error) {
    logger.error('Failed to initialize Firestore', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
};

export const getConversationHistory = async (
  userId: string,
  startDate?: string,
  endDate?: string,
): Promise<{
  messages: Message[];
  total: number;
}> => {
  try {
    // Get all messages for the user
    const messagesSnapshot = await getFirestore()
      .collection('messages')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .get();

    const messages = messagesSnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
    })) as Message[];

    // Filter messages by date range if provided
    const filteredMessages = messages.filter(msg => {
      if (startDate && new Date(msg.timestamp) < new Date(startDate)) {
        return false;
      }
      if (endDate && new Date(msg.timestamp) > new Date(endDate)) {
        return false;
      }
      return true;
    });

    return {
      messages: filteredMessages,
      total: filteredMessages.length,
    };
  } catch (error) {
    logger.error('Failed to get conversation history', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
};
