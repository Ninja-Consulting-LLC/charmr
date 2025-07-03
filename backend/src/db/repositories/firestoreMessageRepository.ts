import {
  Firestore,
  Query,
  QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import {firebaseAdmin} from '../../config/firebase-admin';
import {PromptVariant} from '../../types';
import {MessageMode, MessageRole, MessageType} from '../../types/enums';
import logger from '../../utils/logger';
import {ConversationItem, ID, Message, MessageFilter} from '../types';
import {MessageRepository} from './messageRepository';

export class FirestoreMessageRepository implements MessageRepository {
  private readonly db: Firestore;
  private messageCache: Map<
    string,
    {
      messages: Message[];
      timestamp: number;
    }
  > = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.db = firebaseAdmin.firestore();
  }

  private getMessagesCollection(userId: string, matchId?: string) {
    const effectiveMatchId = matchId || 'no_match';
    return this.db
      .collection('users')
      .doc(userId)
      .collection('matches')
      .doc(effectiveMatchId)
      .collection('messages');
  }

  async createMessage(
    userId: string,
    matchId: string | undefined,
    message: {
      role: MessageRole;
      type?: MessageType;
      mode?: MessageMode;
      used?: boolean;
      replyTo?: number;
      content: string;
      timestamp: string;
      imageData?: string;
      promptVariant?: PromptVariant;
      // Cost fields
      model?: string;
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
      inputCost?: number;
      outputCost?: number;
      totalCost?: number;
      costTimestamp?: string;
    },
  ): Promise<Message> {
    try {
      const messageRef = this.getMessagesCollection(userId, matchId).doc();
      const messageData = {
        ...message,
        id: messageRef.id,
      };
      await messageRef.set(messageData);

      // Update cache if it exists
      const cacheKey = `${userId}-${matchId || 'all'}`;
      const cached = this.messageCache.get(cacheKey);
      if (cached) {
        // Add new message to the beginning of the array (since messages are ordered by timestamp desc)
        cached.messages.unshift(messageData as Message);
        // Update timestamp to extend cache life
        cached.timestamp = Date.now();
        logger.debug('[Repository] Updated cache with new message:', {
          cacheKey,
          newMessageId: messageData.id,
          totalMessages: cached.messages.length,
        });
      } else {
        // If no cache exists, invalidate to force a fresh load
        this.invalidateCache(userId, matchId);
      }

      return messageData as Message;
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
    matchId: string | undefined,
    filter?: MessageFilter,
    pagination?: {
      limit: number;
      offset: number;
    },
  ): Promise<{
    messages: Message[];
    total: number;
  }> {
    try {
      const cacheKey = `${userId}-${matchId || 'all'}`;
      const cached = this.messageCache.get(cacheKey);
      const now = Date.now();

      // Return cached data if it exists and is not expired
      if (cached && now - cached.timestamp < this.CACHE_TTL) {
        logger.debug('[Repository] Using cached messages:', {
          userId,
          matchId,
          cachedCount: cached.messages.length,
        });

        if (pagination) {
          const start = pagination.offset;
          const end = start + pagination.limit;
          return {
            messages: cached.messages.slice(start, end),
            total: cached.messages.length,
          };
        }
        return {
          messages: cached.messages,
          total: cached.messages.length,
        };
      }

      let query: Query = this.getMessagesCollection(userId, matchId);

      // Always exclude system messages
      query = query.where('role', '!=', 'system');

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

      // Get total count first
      const totalSnapshot = await query.count().get();
      const total = totalSnapshot.data().count;

      // Order by timestamp descending (newest first)
      query = query.orderBy('timestamp', 'desc');

      // Get all messages for caching
      const snapshot = await query.get();
      const messages = snapshot.docs.map((doc: QueryDocumentSnapshot) => {
        const data = doc.data() as Omit<Message, 'id'>;
        return {
          id: doc.id,
          ...data,
        };
      }) as Message[];

      // Cache the results
      this.messageCache.set(cacheKey, {
        messages,
        timestamp: now,
      });

      logger.debug('[Repository] Cached messages:', {
        userId,
        matchId,
        messageCount: messages.length,
        cacheKey,
      });

      // Apply pagination if requested
      if (pagination) {
        const start = pagination.offset;
        const end = start + pagination.limit;
        return {
          messages: messages.slice(start, end),
          total,
        };
      }

      return {
        messages,
        total,
      };
    } catch (error) {
      console.error(
        '[Repository] Failed to get messages by match from Firestore:',
        error,
      );
      logger.error('Failed to get messages by match from Firestore', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async getConversationTimeline(
    userId: string,
    matchId: string | undefined,
    pagination?: {
      limit: number;
      offset: number;
    },
  ): Promise<{
    items: ConversationItem[];
    total: number;
  }> {
    try {
      // Get all messages
      const {messages} = await this.getMessagesByMatch(userId, matchId);

      // DO NOT sort ascending. Paginate on the original (DESC) order from Firestore.
      const start = pagination?.offset || 0;
      const end = pagination?.limit ? start + pagination.limit : undefined;
      const paginatedMessages = messages.slice(start, end);

      return {
        items: paginatedMessages,
        total: messages.length,
      };
    } catch (error) {
      logger.error('Failed to get conversation timeline', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async markMessageAsUsed(messageId: ID): Promise<void> {
    try {
      const messageRef = this.db
        .collection('messages')
        .doc(messageId.toString());
      await messageRef.update({used: true});

      // Update cache if it exists
      for (const [cacheKey, cached] of this.messageCache.entries()) {
        const messageIndex = cached.messages.findIndex(m => m.id === messageId);
        if (messageIndex !== -1) {
          cached.messages[messageIndex] = {
            ...cached.messages[messageIndex],
            used: true,
          };
          // Update timestamp to extend cache life
          cached.timestamp = Date.now();
          logger.debug('[Repository] Updated cache for used message:', {
            cacheKey,
            messageId,
            totalMessages: cached.messages.length,
          });
          break;
        }
      }
    } catch (error) {
      logger.error('Failed to mark message as used', {
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

  // Add method to invalidate cache when new messages are added
  private invalidateCache(userId: string, matchId?: string) {
    const cacheKey = `${userId}-${matchId || 'all'}`;
    this.messageCache.delete(cacheKey);
    logger.debug('[Repository] Invalidated cache:', {cacheKey});
  }
}
