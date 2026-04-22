import {PromptVariant} from '../../types';
import {MessageMode, MessageRole, MessageType} from '../../types/enums';
import logger from '../../utils/logger';
import {ConversationItem, Database, ID, Message, MessageFilter} from '../types';

export type SeedTestDataCustom = {
  userMessage?: string;
  assistantMessage?: string;
  alternateMessage?: string;
  summaryContent?: string;
  coachAdvice?: string;
};

export interface MessageRepository {
  createMessage(
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
      model?: string;
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
      inputCost?: number;
      outputCost?: number;
      totalCost?: number;
      costTimestamp?: string;
    },
  ): Promise<Message>;

  /** SQLite test helper: seeds messages + one screenshot for a match. */
  seedTestData?(
    userId: string,
    matchId: string,
    customContent?: SeedTestDataCustom,
  ): Promise<{
    userMessage: Message;
    assistantMessage: Message;
    alternateMessage: Message;
    screenshot: {
      id: number;
      userId: string;
      matchId: string;
      imageData: string;
      timestamp: string;
    };
    summaryMessage: Message;
    coachMessage: Message;
  }>;

  getMessagesByMatch(
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
  }>;

  getConversationTimeline(
    userId: string,
    matchId: string | undefined,
    pagination?: {
      limit: number;
      offset: number;
    },
  ): Promise<{
    items: ConversationItem[];
    total: number;
  }>;

  markMessageAsUsed(messageId: ID): Promise<void>;
}

export class SQLiteMessageRepository implements MessageRepository {
  constructor(private db: Database) {}

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
    const mid = matchId ?? '';
    return this.db.saveMessage(userId, mid, {
      ...message,
      type: message.type || MessageType.TEXT,
      mode: message.mode || MessageMode.GENERATE,
    });
  }

  async seedTestData(
    userId: string,
    matchId: string,
    customContent?: SeedTestDataCustom,
  ): Promise<{
    userMessage: Message;
    assistantMessage: Message;
    alternateMessage: Message;
    screenshot: {
      id: number;
      userId: string;
      matchId: string;
      imageData: string;
      timestamp: string;
    };
    summaryMessage: Message;
    coachMessage: Message;
  }> {
    const ts = new Date().toISOString();
    const c = {
      userMessage: customContent?.userMessage ?? 'What should I say next?',
      assistantMessage:
        customContent?.assistantMessage ?? 'Try asking about their interests',
      alternateMessage:
        customContent?.alternateMessage ?? 'Here is an alternate response',
      summaryContent:
        customContent?.summaryContent ??
        'Summary of the conversation context',
      coachAdvice:
        customContent?.coachAdvice ?? 'Focus on being genuine and curious',
    };
    const placeholderImage = 'base64-placeholder-image-data';

    const shotResult = await this.db.run(
      'INSERT INTO screenshots (userId, matchId, imageData, timestamp) VALUES (?, ?, ?, ?)',
      [userId, matchId, placeholderImage, ts],
    );
    const screenshotId = shotResult.lastID as number;

    const userMessage = await this.db.saveMessage(userId, matchId, {
      role: MessageRole.USER,
      type: MessageType.TEXT,
      mode: MessageMode.GENERATE,
      content: c.userMessage,
      timestamp: ts,
    });

    const assistantMessage = await this.db.saveMessage(userId, matchId, {
      role: MessageRole.ASSISTANT,
      type: MessageType.TEXT,
      mode: MessageMode.GENERATE,
      used: true,
      content: c.assistantMessage,
      timestamp: ts,
    });

    const alternateMessage = await this.db.saveMessage(userId, matchId, {
      role: MessageRole.ASSISTANT,
      type: MessageType.TEXT,
      mode: MessageMode.GENERATE,
      used: false,
      replyTo: Number(assistantMessage.id),
      content: c.alternateMessage,
      timestamp: ts,
    });

    const summaryMessage = await this.db.saveMessage(userId, matchId, {
      role: MessageRole.SYSTEM,
      type: MessageType.SUMMARY,
      mode: MessageMode.GENERATE,
      replyTo: screenshotId,
      content: c.summaryContent,
      timestamp: ts,
    });

    const coachMessage = await this.db.saveMessage(userId, matchId, {
      role: MessageRole.ASSISTANT,
      type: MessageType.TEXT,
      mode: MessageMode.COACH,
      used: false,
      content: c.coachAdvice,
      timestamp: ts,
    });

    const norm = (m: Message): Message => ({
      ...m,
      used: Boolean(m.used),
    });

    return {
      userMessage: norm(userMessage),
      assistantMessage: norm(assistantMessage),
      alternateMessage: norm(alternateMessage),
      screenshot: {
        id: screenshotId,
        userId,
        matchId,
        imageData: placeholderImage,
        timestamp: ts,
      },
      summaryMessage: norm(summaryMessage),
      coachMessage: norm(coachMessage),
    };
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
      let query = 'SELECT * FROM messages WHERE userId = ? AND matchId = ?';
      const params: any[] = [userId, matchId || null];

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

      query += ' ORDER BY timestamp DESC';

      if (pagination) {
        query += ' LIMIT ? OFFSET ?';
        params.push(pagination.limit);
        params.push(pagination.offset);
      }

      const messages = await this.db.all(query, params);
      const total = await this.db.get(
        'SELECT COUNT(*) as cnt FROM messages WHERE userId = ? AND matchId = ?',
        [userId, matchId || null],
      );

      return {
        messages: messages.map(m => ({
          ...m,
          used: Boolean(m.used),
        })),
        total: total?.cnt ?? 0,
      };
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
      logger.debug('[Repository] Getting conversation timeline:', {
        userId,
        matchId,
        pagination,
      });

      // Get all messages
      const {messages} = await this.getMessagesByMatch(userId, matchId);

      logger.debug('[Repository] Retrieved messages from database:', {
        userId,
        matchId,
        totalMessages: messages.length,
        messageIds: messages.map(m => m.id),
      });

      // DO NOT sort ascending. Paginate on the original (DESC) order from DB.
      const start = pagination?.offset || 0;
      const end = pagination?.limit ? start + pagination.limit : undefined;
      const paginatedMessages = messages.slice(start, end);

      logger.debug('[Repository] Paginated messages:', {
        userId,
        matchId,
        start,
        end,
        paginatedCount: paginatedMessages.length,
        paginatedIds: paginatedMessages.map(m => m.id),
      });

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
