import {MessageMode, MessageRole, MessageType} from '../../types/enums';
import logger from '../../utils/logger';
import {ConversationItem, Database, Message, MessageFilter} from '../types';

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

  markMessageAsUsed(messageId: number): Promise<void>;

  createScreenshot(
    userId: string,
    matchId: string,
    screenshot: {
      imageData: string; // base64 encoded image
      timestamp: string;
    },
  ): Promise<{
    id: number;
    userId: string;
    matchId: string;
    imageData: string;
    timestamp: string;
  }>;

  getScreenshotsByMatch(
    userId: string,
    matchId: string,
  ): Promise<
    Array<{
      id: number;
      userId: string;
      matchId: string;
      imageData: string;
      timestamp: string;
    }>
  >;
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
    },
  ): Promise<Message> {
    try {
      const defaultMessage = {
        type: MessageType.TEXT,
        mode: MessageMode.GENERATE,
        used: false,
      };

      const messageWithDefaults = {
        ...defaultMessage,
        ...message,
      };

      return await this.db.saveMessage(userId, matchId, messageWithDefaults);
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

      // Get all screenshots
      const screenshots = await this.getScreenshotsByMatch(userId, matchId);

      // Combine and sort by timestamp
      const timeline: ConversationItem[] = [
        ...messages,
        ...screenshots.map(screenshot => ({
          id: screenshot.id,
          userId: screenshot.userId,
          matchId: screenshot.matchId,
          role: MessageRole.SYSTEM,
          type: MessageType.IMAGE,
          mode: MessageMode.GENERATE,
          used: true,
          content: 'Screenshot',
          imageData: screenshot.imageData,
          timestamp: screenshot.timestamp,
        })),
      ].sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );

      return timeline;
    } catch (error) {
      logger.error('Failed to get conversation timeline', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async markMessageAsUsed(messageId: number): Promise<void> {
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

  async createScreenshot(
    userId: string,
    matchId: string,
    screenshot: {
      imageData: string;
      timestamp: string;
    },
  ): Promise<{
    id: number;
    userId: string;
    matchId: string;
    imageData: string;
    timestamp: string;
  }> {
    try {
      const result = await this.db.run(
        'INSERT INTO screenshots (userId, matchId, imageData, timestamp) VALUES (?, ?, ?, ?)',
        [userId, matchId, screenshot.imageData, screenshot.timestamp],
      );

      const insertedScreenshot = await this.db.get(
        'SELECT * FROM screenshots WHERE id = ?',
        [result.lastID],
      );

      return insertedScreenshot;
    } catch (error) {
      logger.error('Failed to create screenshot', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async getScreenshotsByMatch(
    userId: string,
    matchId: string,
  ): Promise<
    Array<{
      id: number;
      userId: string;
      matchId: string;
      imageData: string;
      timestamp: string;
    }>
  > {
    try {
      const screenshots = await this.db.all(
        'SELECT * FROM screenshots WHERE userId = ? AND matchId = ? ORDER BY timestamp DESC',
        [userId, matchId],
      );
      return screenshots;
    } catch (error) {
      logger.error('Failed to get screenshots by match', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async seedTestData(
    userId: string,
    matchId: string,
    options?: {
      userMessage?: string;
      assistantMessage?: string;
      alternateMessage?: string;
      screenshotData?: string;
      summaryContent?: string;
      coachAdvice?: string;
    },
  ): Promise<{
    userMessage: Message;
    assistantMessage: Message;
    alternateMessage: Message;
    screenshot: {id: number; imageData: string};
    summaryMessage: Message;
    coachMessage: Message;
  }> {
    try {
      const baseTimestamp = new Date().toISOString();

      // Create user message
      const userMessage = await this.createMessage(userId, matchId, {
        role: MessageRole.USER,
        type: MessageType.TEXT,
        content: options?.userMessage || 'What should I say next?',
        timestamp: baseTimestamp,
      });

      // Create assistant reply (used)
      const assistantMessage = await this.createMessage(userId, matchId, {
        role: MessageRole.ASSISTANT,
        type: MessageType.TEXT,
        mode: MessageMode.GENERATE,
        used: true,
        content: options?.assistantMessage || 'Try this message...',
        timestamp: new Date(Date.now() + 1000).toISOString(),
      });

      // Create alternate assistant reply (unused)
      const alternateMessage = await this.createMessage(userId, matchId, {
        role: MessageRole.ASSISTANT,
        type: MessageType.TEXT,
        mode: MessageMode.GENERATE,
        used: false,
        replyTo: assistantMessage.id,
        content: options?.alternateMessage || "Here's another option...",
        timestamp: new Date(Date.now() + 2000).toISOString(),
      });

      // Create screenshot
      const screenshot = await this.createScreenshot(userId, matchId, {
        imageData:
          options?.screenshotData ||
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', // 1x1 transparent pixel
        timestamp: new Date(Date.now() + 3000).toISOString(),
      });

      // Create summary message
      const summaryMessage = await this.createMessage(userId, matchId, {
        role: MessageRole.SYSTEM,
        type: MessageType.SUMMARY,
        replyTo: screenshot.id,
        content: options?.summaryContent || 'Screenshot analysis summary...',
        timestamp: new Date(Date.now() + 4000).toISOString(),
      });

      // Create coach advice message
      const coachMessage = await this.createMessage(userId, matchId, {
        role: MessageRole.ASSISTANT,
        type: MessageType.TEXT,
        mode: MessageMode.COACH,
        content: options?.coachAdvice || "Here's some coaching advice...",
        timestamp: new Date(Date.now() + 5000).toISOString(),
      });

      return {
        userMessage,
        assistantMessage,
        alternateMessage,
        screenshot,
        summaryMessage,
        coachMessage,
      };
    } catch (error) {
      logger.error('Failed to seed test data', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }
}
