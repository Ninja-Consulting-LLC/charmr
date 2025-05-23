import path from 'path';
import {open} from 'sqlite';
import sqlite3 from 'sqlite3';
import {config} from '../config/config';
import {SubscriptionTier} from '../types/enums';
import logger from '../utils/logger';
import {
  Database,
  Match,
  Message,
  MessageCost,
  SupportTicket,
  User,
} from './types';

export const createSqliteDatabase = async (): Promise<Database> => {
  const dbPath =
    process.env.DB_PATH || path.join(process.cwd(), 'data', 'charmr.db');
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  // Initialize database schema
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT,
      name TEXT,
      plan TEXT NOT NULL,
      dailyMessagesUsed INTEGER NOT NULL,
      extraMessages INTEGER NOT NULL,
      lastResetDate TEXT NOT NULL,
      installationId TEXT UNIQUE
    );

    CREATE INDEX IF NOT EXISTS idx_users_installation_id ON users(installationId);

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      matchId TEXT NOT NULL,
      role TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'text',
      mode TEXT NOT NULL DEFAULT 'generate',
      used BOOLEAN NOT NULL DEFAULT 0,
      replyTo INTEGER,
      content TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (replyTo) REFERENCES messages(id)
    );

    CREATE INDEX IF NOT EXISTS idx_messages_user_match ON messages(userId, matchId);
    CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
    CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);
    CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(type);
    CREATE INDEX IF NOT EXISTS idx_messages_used ON messages(used);

    CREATE TABLE IF NOT EXISTS screenshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      matchId TEXT NOT NULL,
      imageData TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (matchId) REFERENCES matches(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_screenshots_user_match ON screenshots(userId, matchId);
    CREATE INDEX IF NOT EXISTS idx_screenshots_timestamp ON screenshots(timestamp);

    CREATE TABLE IF NOT EXISTS message_costs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      messageId INTEGER NOT NULL,
      model TEXT NOT NULL,
      promptTokens INTEGER NOT NULL,
      completionTokens INTEGER NOT NULL,
      totalTokens INTEGER NOT NULL,
      inputCost REAL NOT NULL,
      outputCost REAL NOT NULL,
      totalCost REAL NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (messageId) REFERENCES messages(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_message_costs_message ON message_costs(messageId);
    CREATE INDEX IF NOT EXISTS idx_message_costs_timestamp ON message_costs(timestamp);

    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      name TEXT NOT NULL,
      platform TEXT NOT NULL,
      lastUsed TEXT,
      hidden BOOLEAN NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(userId, name, platform)
    );

    CREATE INDEX IF NOT EXISTS idx_matches_user ON matches(userId);
    CREATE INDEX IF NOT EXISTS idx_matches_last_used ON matches(lastUsed);
    CREATE INDEX IF NOT EXISTS idx_matches_hidden ON matches(hidden);
  `);

  return {
    getUser: async (userId: string): Promise<User | null> => {
      try {
        const user = await db.get('SELECT * FROM users WHERE id = ?', userId);
        return user || null;
      } catch (error) {
        logger.error('Failed to get user', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    },

    getUserByInstallationId: async (
      installationId: string,
    ): Promise<User | null> => {
      try {
        const user = await db.get(
          'SELECT * FROM users WHERE installationId = ?',
          installationId,
        );
        return user || null;
      } catch (error) {
        logger.error('Failed to get user by installation ID', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    },

    createUser: async (
      userId: string,
      email?: string,
      name?: string,
      plan: SubscriptionTier = SubscriptionTier.FREE,
      installationId?: string,
    ): Promise<User> => {
      try {
        const user: User = {
          id: userId,
          email,
          name,
          plan,
          dailyMessagesUsed: 0,
          extraMessages: 0,
          lastResetDate: new Date().toISOString().split('T')[0],
          installationId,
        };

        await db.run(
          'INSERT INTO users (id, email, name, plan, dailyMessagesUsed, extraMessages, lastResetDate, installationId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            user.id,
            user.email,
            user.name,
            user.plan,
            user.dailyMessagesUsed,
            user.extraMessages,
            user.lastResetDate,
            user.installationId,
          ],
        );

        return user;
      } catch (error) {
        logger.error('Failed to create user', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    },

    updateUser: async (
      userId: string,
      updates: Partial<User>,
    ): Promise<void> => {
      try {
        const setClause = Object.keys(updates)
          .map(key => `${key} = ?`)
          .join(', ');
        const values = Object.values(updates);
        values.push(userId);

        await db.run(`UPDATE users SET ${setClause} WHERE id = ?`, values);
      } catch (error) {
        logger.error('Failed to update user', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    },

    incrementMessageCount: async (userId: string): Promise<boolean> => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const user = await db.get('SELECT * FROM users WHERE id = ?', userId);

        if (!user) {
          logger.error('User not found when incrementing message count', {
            userId,
          });
          return false;
        }

        // Reset daily count if it's a new day
        if (user.lastResetDate !== today) {
          await db.run(
            'UPDATE users SET dailyMessagesUsed = 1, lastResetDate = ? WHERE id = ?',
            [today, userId],
          );
          return true;
        }

        // Check if we can increment based on limits
        const dailyLimit =
          user.plan === 'pro' ? config.limits.proDailyMessageLimit : 5;
        const canIncrement =
          user.dailyMessagesUsed < dailyLimit || user.extraMessages > 0;

        if (!canIncrement) {
          logger.warn('Message limit reached', {
            userId,
            plan: user.plan,
            dailyMessagesUsed: user.dailyMessagesUsed,
            extraMessages: user.extraMessages,
            limit: dailyLimit,
          });
          return false;
        }

        // If we have extra messages, use those first
        if (user.dailyMessagesUsed >= dailyLimit && user.extraMessages > 0) {
          await db.run(
            'UPDATE users SET extraMessages = extraMessages - 1 WHERE id = ?',
            [userId],
          );
        }

        // Increment the daily message count
        await db.run(
          'UPDATE users SET dailyMessagesUsed = dailyMessagesUsed + 1 WHERE id = ?',
          [userId],
        );

        return true;
      } catch (error) {
        logger.error('Failed to increment message count', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
        return false;
      }
    },

    resetDailyMessageCounts: async (): Promise<void> => {
      try {
        const today = new Date().toISOString().split('T')[0];
        await db.run(
          'UPDATE users SET dailyMessagesUsed = 0, lastResetDate = ? WHERE lastResetDate != ?',
          [today, today],
        );
      } catch (error) {
        logger.error('Failed to reset daily message counts', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    },

    addExtraMessages: async (userId: string, count: number): Promise<void> => {
      try {
        await db.run(
          'UPDATE users SET extraMessages = extraMessages + ? WHERE id = ?',
          [count, userId],
        );
      } catch (error) {
        logger.error('Failed to add extra messages', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    },

    updateUserPlan: async (
      userId: string,
      plan: SubscriptionTier,
    ): Promise<void> => {
      try {
        await db.run('UPDATE users SET plan = ? WHERE id = ?', [plan, userId]);
      } catch (error) {
        logger.error('Failed to update user plan', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    },

    // Conversation storage methods
    saveMessage: async (
      userId: string,
      matchId: string,
      message: {
        role: 'user' | 'assistant' | 'system';
        type?: 'text' | 'image' | 'summary';
        mode?: 'generate' | 'coach';
        used?: boolean;
        replyTo?: number;
        content: string;
        timestamp: string;
      },
    ): Promise<Message> => {
      try {
        const defaultMessage = {
          type: 'text' as const,
          mode: 'generate' as const,
          used: false,
        };

        const messageWithDefaults = {
          ...defaultMessage,
          ...message,
        };

        const result = await db.run(
          'INSERT INTO messages (userId, matchId, role, type, mode, used, replyTo, content, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            userId,
            matchId,
            messageWithDefaults.role,
            messageWithDefaults.type,
            messageWithDefaults.mode,
            messageWithDefaults.used ? 1 : 0,
            messageWithDefaults.replyTo || null,
            messageWithDefaults.content,
            messageWithDefaults.timestamp,
          ],
        );

        const insertedMessage = await db.get(
          'SELECT * FROM messages WHERE id = ?',
          [result.lastID],
        );

        return {
          ...insertedMessage,
          used: Boolean(insertedMessage.used),
        };
      } catch (error) {
        logger.error('Failed to save message', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    },

    getMessages: async (
      userId: string,
      matchId?: string,
    ): Promise<Message[]> => {
      try {
        let query = 'SELECT * FROM messages WHERE userId = ?';
        const params: any[] = [userId];

        if (matchId) {
          query += ' AND matchId = ?';
          params.push(matchId);
        }

        query += ' ORDER BY timestamp DESC';
        const messages = await db.all(query, params);

        return messages.map(msg => ({
          ...msg,
          used: Boolean(msg.used),
        }));
      } catch (error) {
        logger.error('Failed to get messages', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    },

    all: async (sql: string, params: any[] = []): Promise<any[]> => {
      try {
        return await db.all(sql, params);
      } catch (error) {
        logger.error('Failed to execute query', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    },

    get: async (sql: string, params: any[] = []): Promise<any> => {
      try {
        return await db.get(sql, params);
      } catch (error) {
        logger.error('Failed to execute query', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    },

    run: async (sql: string, params: any[] = []): Promise<any> => {
      try {
        return await db.run(sql, params);
      } catch (error) {
        logger.error('Failed to execute query', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    },

    clearDatabase: async (): Promise<void> => {
      try {
        await db.run('DELETE FROM messages');
        await db.run('DELETE FROM users');
        logger.info('Database cleared successfully');
      } catch (error) {
        logger.error('Failed to clear database', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    },

    saveMessageCost: async (
      messageId: number,
      cost: Omit<MessageCost, 'id' | 'messageId'>,
    ): Promise<MessageCost> => {
      try {
        const result = await db.run(
          `INSERT INTO message_costs (
            messageId, model, promptTokens, completionTokens, totalTokens,
            inputCost, outputCost, totalCost, timestamp
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            messageId,
            cost.model,
            cost.promptTokens,
            cost.completionTokens,
            cost.totalTokens,
            cost.inputCost,
            cost.outputCost,
            cost.totalCost,
            cost.timestamp,
          ],
        );

        return {
          id: result.lastID!,
          messageId,
          ...cost,
        };
      } catch (error) {
        logger.error('Failed to save message cost', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          messageId,
          cost,
        });
        throw error;
      }
    },

    getMessageCosts: async (
      userId: string,
      startDate?: string,
      endDate?: string,
    ): Promise<MessageCost[]> => {
      try {
        let query = `
          SELECT mc.*
          FROM message_costs mc
          JOIN messages m ON mc.messageId = m.id
          WHERE m.userId = ?
        `;
        const params: any[] = [userId];

        if (startDate) {
          query += ' AND mc.timestamp >= ?';
          params.push(startDate);
        }
        if (endDate) {
          query += ' AND mc.timestamp <= ?';
          params.push(endDate);
        }

        query += ' ORDER BY mc.timestamp DESC';

        return await db.all(query, params);
      } catch (error) {
        logger.error('Failed to get message costs', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          userId,
          startDate,
          endDate,
        });
        throw error;
      }
    },

    getTotalCosts: async (
      userId: string,
      startDate?: string,
      endDate?: string,
    ): Promise<{
      totalCost: number;
      totalTokens: number;
      messageCount: number;
    }> => {
      try {
        let query = `
          SELECT
            SUM(mc.totalCost) as totalCost,
            SUM(mc.totalTokens) as totalTokens,
            COUNT(DISTINCT mc.messageId) as messageCount
          FROM message_costs mc
          JOIN messages m ON mc.messageId = m.id
          WHERE m.userId = ?
        `;
        const params: any[] = [userId];

        if (startDate) {
          query += ' AND mc.timestamp >= ?';
          params.push(startDate);
        }
        if (endDate) {
          query += ' AND mc.timestamp <= ?';
          params.push(endDate);
        }

        const result = await db.get(query, params);
        return {
          totalCost: result.totalCost || 0,
          totalTokens: result.totalTokens || 0,
          messageCount: result.messageCount || 0,
        };
      } catch (error) {
        logger.error('Failed to get total costs', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          userId,
          startDate,
          endDate,
        });
        throw error;
      }
    },

    // Match methods
    getMatches: async (
      userId: string,
      includeHidden: boolean = false,
    ): Promise<Match[]> => {
      try {
        logger.debug('Database getMatches called with:', {
          userId,
          includeHidden,
        });
        const query = `
          SELECT * FROM matches
          WHERE userId = ?
          ${includeHidden ? '' : 'AND hidden = 0'}
          ORDER BY lastUsed DESC NULLS LAST
        `;
        logger.debug('Database query:', {query});
        const matches = await db.all(query, [userId]);
        logger.debug('Database query result:', {
          matchesCount: matches.length,
          hiddenMatchesCount: matches.filter(m => m.hidden).length,
        });
        return matches;
      } catch (error) {
        logger.error('Failed to get matches', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    },

    addMatch: async (
      userId: string,
      name: string,
      platform: string,
    ): Promise<Match> => {
      try {
        const now = new Date().toISOString();
        const result = await db.run(
          `INSERT INTO matches (userId, name, platform, lastUsed, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [userId, name, platform, now, now, now],
        );

        const match = await db.get('SELECT * FROM matches WHERE id = ?', [
          result.lastID,
        ]);

        return match;
      } catch (error) {
        logger.error('Failed to add match', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    },

    updateMatchLastUsed: async (
      userId: string,
      name: string,
      platform: string,
    ): Promise<void> => {
      try {
        const now = new Date().toISOString();
        await db.run(
          `UPDATE matches
           SET lastUsed = ?, updatedAt = ?
           WHERE userId = ? AND name = ? AND platform = ?`,
          [now, now, userId, name, platform],
        );
      } catch (error) {
        logger.error('Failed to update match last used', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    },

    deleteMatch: async (userId: string, matchId: string): Promise<void> => {
      try {
        await db.run('DELETE FROM matches WHERE id = ? AND userId = ?', [
          matchId,
          userId,
        ]);
      } catch (error) {
        logger.error('Failed to delete match', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    },

    hideMatch: async (
      userId: string,
      name: string,
      platform: string,
    ): Promise<void> => {
      try {
        const now = new Date().toISOString();
        await db.run(
          `UPDATE matches
           SET hidden = 1, updatedAt = ?
           WHERE userId = ? AND name = ? AND platform = ?`,
          [now, userId, name, platform],
        );
      } catch (error) {
        logger.error('Failed to hide match', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    },

    restoreMatch: async (
      userId: string,
      name: string,
      platform: string,
    ): Promise<void> => {
      try {
        const now = new Date().toISOString();
        await db.run(
          `UPDATE matches
           SET hidden = 0, updatedAt = ?
           WHERE userId = ? AND name = ? AND platform = ?`,
          [now, userId, name, platform],
        );
      } catch (error) {
        logger.error('Failed to restore match', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    },

    getMatchById: async (matchId: number | string) => {
      try {
        const match = await db.get('SELECT * FROM matches WHERE id = ?', [
          matchId,
        ]);
        return match || null;
      } catch (error) {
        logger.error('Failed to get match by id', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          matchId,
        });
        throw error;
      }
    },

    getConversationHistory: async (
      userId: string,
      matchId: string,
    ): Promise<
      Array<{
        role: string;
        content: string;
        timestamp: string;
      }>
    > => {
      try {
        const messages = await db.all(
          'SELECT role, content, timestamp FROM messages WHERE userId = ? AND matchId = ? ORDER BY timestamp ASC',
          [userId, matchId],
        );
        return messages;
      } catch (error) {
        logger.error('Failed to get conversation history', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    },

    support: {
      createTicket: async (
        ticket: Omit<SupportTicket, 'id'>,
      ): Promise<SupportTicket> => {
        try {
          const result = await db.run(
            'INSERT INTO support_tickets (userId, subject, message, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
            [
              ticket.userId,
              ticket.subject,
              ticket.message,
              ticket.status,
              ticket.createdAt.toISOString(),
              ticket.updatedAt.toISOString(),
            ],
          );

          const insertedTicket = await db.get(
            'SELECT * FROM support_tickets WHERE id = ?',
            [result.lastID],
          );

          return insertedTicket;
        } catch (error) {
          logger.error('Failed to create support ticket', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
          });
          throw error;
        }
      },

      getTicketsByUserId: async (userId: string): Promise<SupportTicket[]> => {
        try {
          const tickets = await db.all(
            'SELECT * FROM support_tickets WHERE userId = ? ORDER BY createdAt DESC',
            [userId],
          );
          return tickets;
        } catch (error) {
          logger.error('Failed to get tickets by user ID', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
          });
          throw error;
        }
      },

      updateTicketStatus: async (
        ticketId: string,
        status: SupportTicket['status'],
      ): Promise<void> => {
        try {
          const now = new Date().toISOString();
          await db.run(
            'UPDATE support_tickets SET status = ?, updatedAt = ? WHERE id = ?',
            [status, now, ticketId],
          );
        } catch (error) {
          logger.error('Failed to update ticket status', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
          });
          throw error;
        }
      },
    },
  };
};
