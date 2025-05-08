import path from 'path';
import {open} from 'sqlite';
import sqlite3 from 'sqlite3';
import {config} from '../config/config';
import {SubscriptionTier} from '../types/enums';
import logger from '../utils/logger';
import {Database, MessageCost, User} from './types';

export const createSqliteDatabase = async (): Promise<Database> => {
  const dbPath = path.join(process.cwd(), 'data', 'charmr.db');
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
      content TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id)
    );

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
        content: string;
        timestamp: string;
      },
    ): Promise<{
      id: number;
      userId: string;
      matchId: string;
      role: 'user' | 'assistant' | 'system';
      content: string;
      timestamp: string;
    }> => {
      try {
        const result = await db.run(
          'INSERT INTO messages (userId, matchId, role, content, timestamp) VALUES (?, ?, ?, ?, ?)',
          [userId, matchId, message.role, message.content, message.timestamp],
        );

        // Get the inserted message
        const insertedMessage = await db.get(
          'SELECT * FROM messages WHERE id = ?',
          [result.lastID],
        );

        return insertedMessage;
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
    ): Promise<
      Array<{
        id: number;
        userId: string;
        matchId: string;
        role: 'user' | 'assistant' | 'system';
        content: string;
        timestamp: string;
      }>
    > => {
      try {
        if (matchId) {
          const messages = await db.all(
            'SELECT * FROM messages WHERE userId = ? AND matchId = ? ORDER BY timestamp DESC',
            [userId, matchId],
          );
          return messages;
        } else {
          const messages = await db.all(
            'SELECT * FROM messages WHERE userId = ? ORDER BY timestamp DESC',
            [userId],
          );
          return messages;
        }
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
  };
};
