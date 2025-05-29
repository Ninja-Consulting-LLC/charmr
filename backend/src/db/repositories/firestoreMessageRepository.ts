import {Firestore, QueryDocumentSnapshot} from 'firebase-admin/firestore';
import {firebaseAdmin} from '../../config/firebase-admin';
import {MessageMode, MessageRole, MessageType} from '../../types/enums';
import logger from '../../utils/logger';
import {ConversationItem, ID, Message, MessageFilter} from '../types';
import {MessageRepository} from './messageRepository';

export class FirestoreMessageRepository implements MessageRepository {
  private readonly messagesCollection: string = 'messages';
  private readonly db: Firestore;

  constructor() {
    this.db = firebaseAdmin.firestore();
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
      const messageData = {
        userId,
        matchId,
        role: message.role,
        type: message.type || MessageType.TEXT,
        mode: message.mode || MessageMode.GENERATE,
        used: message.used || false,
        replyTo: message.replyTo || null,
        content: message.content,
        timestamp: message.timestamp,
        imageData: message.imageData || null,
      };

      const docRef = await this.db
        .collection(this.messagesCollection)
        .add(messageData);
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
      let query = this.db
        .collection(this.messagesCollection)
        .where('userId', '==', userId)
        .where('matchId', '==', matchId);

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
      const docRef = this.db
        .collection(this.messagesCollection)
        .doc(messageId.toString());
      await docRef.update({used: true});
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
      const snapshot = await this.db.collection(this.messagesCollection).get();
      const batch = this.db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      logger.info('Messages collection cleared successfully');
    } catch (error) {
      logger.error('Failed to clear messages collection', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }
}
