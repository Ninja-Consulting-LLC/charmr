import {MessageMode, MessageRole, MessageType} from '../../types/enums';
import logger from '../../utils/logger';
import {ConversationItem, Database, ID, Message, MessageFilter} from '../types';

export interface MessageRepository {
  createMessage(
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
  ): Promise<Message>;

  getMessagesByMatch(
    userId: string,
    matchId: string,
    filter?: MessageFilter,
  ): Promise<Message[]>;

  getConversationTimeline(
    userId: string,
    matchId: string,
  ): Promise<ConversationItem[]>;

  markMessageAsUsed(messageId: ID): Promise<void>;
}

export class SQLiteMessageRepository implements MessageRepository {
  constructor(private db: Database) {}

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
      const result = await this.db.run(
        'INSERT INTO messages (userId, matchId, role, type, mode, used, replyTo, content, timestamp, imageData) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          userId,
          matchId,
          message.role,
          message.type || MessageType.TEXT,
          message.mode || MessageMode.GENERATE,
          message.used ? 1 : 0,
          message.replyTo || null,
          message.content,
          message.timestamp,
          message.imageData || null,
        ],
      );

      const insertedMessage = await this.db.get(
        'SELECT * FROM messages WHERE id = ?',
        [result.lastID],
      );

      return insertedMessage;
    } catch (error) {
      logger.error('Failed to create message', {
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
      let query = 'SELECT * FROM messages WHERE userId = ? AND matchId = ?';
      const params: any[] = [userId, matchId];

      if (filter) {
        if (filter.role) {
          query += ' AND role = ?';
          params.push(filter.role);
        }
        if (filter.type) {
          query += ' AND type = ?';
          params.push(filter.type);
        }
        if (filter.mode) {
          query += ' AND mode = ?';
          params.push(filter.mode);
        }
        if (filter.used !== undefined) {
          query += ' AND used = ?';
          params.push(filter.used ? 1 : 0);
        }
      }

      query += ' ORDER BY timestamp ASC';

      const messages = await this.db.all(query, params);
      return messages;
    } catch (error) {
      logger.error('Failed to get messages by match', {
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
      // Get all messages
      const messages = await this.getMessagesByMatch(userId, matchId);

      // Sort by timestamp
      return messages.sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
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
      await this.db.run('UPDATE messages SET used = 1 WHERE id = ?', [
        messageId,
      ]);
    } catch (error) {
      logger.error('Failed to mark message as used', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }
}

export const getMessageRepository = (db: Database): MessageRepository => {
  return new SQLiteMessageRepository(db);
};
