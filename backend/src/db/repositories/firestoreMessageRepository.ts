import {
  Firestore,
  Query,
  QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import {firebaseAdmin} from '../../config/firebase-admin';
import {MessageMode, MessageRole, MessageType} from '../../types/enums';
import logger from '../../utils/logger';
import {ConversationItem, ID, Message, MessageFilter} from '../types';
import {MessageRepository} from './messageRepository';

export class FirestoreMessageRepository implements MessageRepository {
  private readonly db: Firestore;

  constructor() {
    this.db = firebaseAdmin.firestore();
  }

  private getMessagesCollection(userId: string, matchId: string) {
    return this.db
      .collection('users')
      .doc(userId)
      .collection('matches')
      .doc(matchId)
      .collection('messages');
  }

  async createMessage(
    userId: string,
    matchId: string,
    message: {
      role: MessageRole;
      type?: MessageType;
      mode?: MessageMode;
      used?: boolean;
      replyTo?: number;
      content: string;
      timestamp: string;
      imageData?: string;
    },
  ): Promise<Message> {
    try {
      // First check if user exists
      const userDoc = await this.db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        throw new Error(`User ${userId} does not exist`);
      }

      // Then check if match exists
      const matchDoc = await this.db
        .collection('users')
        .doc(userId)
        .collection('matches')
        .doc(matchId)
        .get();
      if (!matchDoc.exists) {
        throw new Error(`Match ${matchId} does not exist for user ${userId}`);
      }

      const messageData = {
        role: message.role,
        type: message.type || MessageType.TEXT,
        mode: message.mode || MessageMode.GENERATE,
        used: message.used || false,
        replyTo: message.replyTo || null,
        content: message.content,
        timestamp: message.timestamp,
        imageData: message.imageData || null,
      };

      const messagesCollection = this.getMessagesCollection(userId, matchId);
      const docRef = await messagesCollection.add(messageData);
      const doc = await docRef.get();

      return {
        id: doc.id,
        ...(doc.data() as Omit<Message, 'id'>),
      } as Message;
    } catch (error) {
      logger.error('Failed to create message in Firestore', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async getMessagesByMatch(
    userId: string,
    matchId: string,
    filter?: MessageFilter,
  ): Promise<Message[]> {
    try {
      let query: Query = this.getMessagesCollection(userId, matchId);

      if (filter) {
        if (filter.role) {
          query = query.where('role', '==', filter.role);
        }
        if (filter.type) {
          query = query.where('type', '==', filter.type);
        }
        if (filter.mode) {
          query = query.where('mode', '==', filter.mode);
        }
        if (filter.used !== undefined) {
          query = query.where('used', '==', filter.used);
        }
      }

      // Order by timestamp ascending
      query = query.orderBy('timestamp', 'asc');

      const snapshot = await query.get();
      return snapshot.docs.map((doc: QueryDocumentSnapshot) => {
        const data = doc.data() as Omit<Message, 'id'>;
        return {
          id: doc.id,
          ...data,
        };
      }) as Message[];
    } catch (error) {
      logger.error('Failed to get messages by match from Firestore', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async getConversationTimeline(
    userId: string,
    matchId: string,
  ): Promise<ConversationItem[]> {
    try {
      const messages = await this.getMessagesByMatch(userId, matchId);
      return messages.sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
    } catch (error) {
      logger.error('Failed to get conversation timeline from Firestore', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async markMessageAsUsed(messageId: ID): Promise<void> {
    try {
      // Since we don't have userId and matchId in the message data anymore,
      // we need to search for the message in all user matches
      const usersSnapshot = await this.db.collection('users').get();

      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const matchesSnapshot = await userDoc.ref.collection('matches').get();

        for (const matchDoc of matchesSnapshot.docs) {
          const matchId = matchDoc.id;
          const messageRef = this.getMessagesCollection(userId, matchId).doc(
            messageId.toString(),
          );
          const messageDoc = await messageRef.get();

          if (messageDoc.exists) {
            await messageRef.update({used: true});
            return;
          }
        }
      }

      throw new Error(`Message ${messageId} not found`);
    } catch (error) {
      logger.error('Failed to mark message as used in Firestore', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async clearDatabase(): Promise<void> {
    try {
      const usersSnapshot = await this.db.collection('users').get();

      for (const userDoc of usersSnapshot.docs) {
        const matchesSnapshot = await userDoc.ref.collection('matches').get();

        for (const matchDoc of matchesSnapshot.docs) {
          const messagesSnapshot = await matchDoc.ref
            .collection('messages')
            .get();
          const batch = this.db.batch();

          messagesSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
          });

          await batch.commit();
        }
      }

      logger.info('Messages collections cleared successfully');
    } catch (error) {
      logger.error('Failed to clear messages collections', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }
}
