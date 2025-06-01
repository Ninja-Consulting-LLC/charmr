import path from 'path';
import {open} from 'sqlite';
import sqlite3 from 'sqlite3';
import {config} from '../config/config';
import {SubscriptionTier} from '../types/enums';
import logger from '../utils/logger';
import {
  Database,
  ID,
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
      type TEXT NOT NULL,
      mode TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      replyTo INTEGER,
      content TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      imageData TEXT,
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
      hidden INTEGER DEFAULT 0,
      deleted INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id)
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

    createUser: async (user: {
      id: string;
      email: string;
      name: string;
      plan?: SubscriptionTier;
      installationId?: string;
    }): Promise<User | null> => {
      try {
        await db.run('BEGIN TRANSACTION');

        // If installationId is provided, check if a user with this ID already exists
        if (user.installationId) {
          const existingUser = await db.get(
            'SELECT * FROM users WHERE installationId = ?',
            user.installationId,
          );
          if (existingUser) {
            // If the existing user is anonymous (no email), link it to the new user
            if (
              !existingUser.email ||
              existingUser.email === existingUser.installationId
            ) {
              logger.info('Linking anonymous user to registered user', {
                anonymousUserId: existingUser.id,
                registeredUserId: user.id,
              });

              try {
                // Transfer all messages from anonymous to registered user
                await db.run(
                  'UPDATE messages SET userId = ? WHERE userId = ?',
                  [user.id, existingUser.id],
                );

                // Transfer all matches from anonymous to registered user
                await db.run('UPDATE matches SET userId = ? WHERE userId = ?', [
                  user.id,
                  existingUser.id,
                ]);

                // Transfer all screenshots from anonymous to registered user
                await db.run(
                  'UPDATE screenshots SET userId = ? WHERE userId = ?',
                  [user.id, existingUser.id],
                );

                // Delete the anonymous user and create the new user
                await db.run('DELETE FROM users WHERE id = ?', [
                  existingUser.id,
                ]);
                await db.run(
                  'INSERT INTO users (id, email, name, plan, dailyMessagesUsed, extraMessages, lastResetDate, installationId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                  [
                    user.id,
                    user.email,
                    user.name,
                    user.plan || SubscriptionTier.FREE,
                    existingUser.dailyMessagesUsed,
                    existingUser.extraMessages,
                    existingUser.lastResetDate,
                    user.installationId,
                  ],
                );

                const updatedUser = await db.get(
                  'SELECT * FROM users WHERE id = ?',
                  user.id,
                );
                await db.run('COMMIT');
                return updatedUser;
              } catch (error) {
                await db.run('ROLLBACK');
                logger.error('Failed to link anonymous user:', {
                  error:
                    error instanceof Error ? error.message : 'Unknown error',
                  stack: error instanceof Error ? error.stack : undefined,
                  anonymousUserId: existingUser.id,
                  registeredUserId: user.id,
                });
                throw error;
              }
            } else {
              // If the existing user is not anonymous, return it
              logger.info('User with installationId already exists', {
                installationId: user.installationId,
              });
              await db.run('COMMIT');
              return existingUser;
            }
          }
        }

        // Create new user
        try {
          await db.run(
            'INSERT INTO users (id, email, name, plan, dailyMessagesUsed, extraMessages, lastResetDate, installationId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [
              user.id,
              user.email,
              user.name,
              user.plan || SubscriptionTier.FREE,
              0,
              0,
              new Date().toISOString().split('T')[0],
              user.installationId,
            ],
          );

          const newUser = await db.get(
            'SELECT * FROM users WHERE id = ?',
            user.id,
          );
          await db.run('COMMIT');
          return newUser;
        } catch (error) {
          await db.run('ROLLBACK');
          logger.error('Failed to create new user:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            userId: user.id,
          });
          throw error;
        }
      } catch (error) {
        await db.run('ROLLBACK');
        logger.error('Failed to create user:', {
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
        imageData?: string;
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
          'INSERT INTO messages (userId, matchId, role, type, mode, used, replyTo, content, timestamp, imageData) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
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
            messageWithDefaults.imageData || null,
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
      pagination?: {
        limit: number;
        offset: number;
      },
    ): Promise<{
      messages: Message[];
      total: number;
    }> => {
      try {
        let query = 'SELECT * FROM messages WHERE userId = ?';
        const params: any[] = [userId];

        if (matchId) {
          query += ' AND matchId = ?';
          params.push(matchId);
        }

        query += ' ORDER BY timestamp DESC';

        if (pagination) {
          query += ' LIMIT ? OFFSET ?';
          params.push(pagination.limit);
          params.push(pagination.offset);
        }

        const messages = await db.all(query, params);
        const total = await db.get(
          'SELECT COUNT(*) as count FROM messages WHERE userId = ?' +
            (matchId ? ' AND matchId = ?' : ''),
          matchId ? [userId, matchId] : [userId],
        );

        return {
          messages: messages.map(msg => ({
            ...msg,
            used: Boolean(msg.used),
          })),
          total: total.count,
        };
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
        // Get all table names
        const tables = await db.all(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
        );

        // Disable foreign key constraints temporarily
        await db.run('PRAGMA foreign_keys = OFF');

        // Clear each table
        for (const table of tables) {
          await db.run(`DELETE FROM ${table.name}`);
        }

        // Reset autoincrement counters
        await db.run('DELETE FROM sqlite_sequence');

        // Re-enable foreign key constraints
        await db.run('PRAGMA foreign_keys = ON');

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
      messageId: ID,
      cost: Omit<MessageCost, 'id' | 'messageId'>,
    ): Promise<MessageCost> => {
      try {
        // Convert string ID to number for SQLite
        const numericMessageId =
          typeof messageId === 'string' ? parseInt(messageId, 10) : messageId;

        const result = await db.run(
          `INSERT INTO message_costs (
            messageId, model, promptTokens, completionTokens, totalTokens,
            inputCost, outputCost, totalCost, timestamp
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            numericMessageId,
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
          messageId: numericMessageId,
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
          AND deleted = 0
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
      match: Omit<Match, 'id'>,
    ): Promise<Match> => {
      try {
        const result = await db.run(
          `INSERT INTO matches (userId, name, platform, lastUsed, hidden, deleted, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            match.name,
            match.platform,
            match.lastUsed,
            match.hidden ? 1 : 0,
            0, // deleted = false
            match.createdAt,
            match.updatedAt,
          ],
        );
        return {
          id: result.lastID!,
          userId,
          name: match.name,
          platform: match.platform,
          lastUsed: match.lastUsed,
          hidden: match.hidden,
          deleted: false,
          createdAt: match.createdAt,
          updatedAt: match.updatedAt,
        };
      } catch (error) {
        logger.error('Failed to add match to SQLite', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    },

    updateMatchLastUsed: async (
      userId: string,
      matchId: string,
    ): Promise<void> => {
      try {
        const now = new Date().toISOString();
        await db.run(
          `UPDATE matches
           SET lastUsed = ?, updatedAt = ?
           WHERE id = ? AND userId = ?`,
          [now, now, matchId, userId],
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
        const now = new Date().toISOString();
        await db.run(
          `UPDATE matches
           SET deleted = 1, updatedAt = ?
           WHERE id = ? AND userId = ?`,
          [now, matchId, userId],
        );
      } catch (error) {
        logger.error('Failed to delete match', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    },

    hideMatch: async (userId: string, matchId: string): Promise<void> => {
      try {
        const now = new Date().toISOString();
        await db.run(
          `UPDATE matches
           SET hidden = 1, updatedAt = ?
           WHERE id = ? AND userId = ?`,
          [now, matchId, userId],
        );
      } catch (error) {
        logger.error('Failed to hide match', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    },

    restoreMatch: async (userId: string, matchId: string): Promise<void> => {
      try {
        const now = new Date().toISOString();
        await db.run(
          `UPDATE matches
           SET hidden = 0, updatedAt = ?
           WHERE id = ? AND userId = ?`,
          [now, matchId, userId],
        );
      } catch (error) {
        logger.error('Failed to restore match', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    },

    getMatchById: async (userId: string, matchId: number | string) => {
      try {
        const match = await db.get(
          'SELECT * FROM matches WHERE id = ? AND userId = ?',
          [matchId, userId],
        );
        return match || null;
      } catch (error) {
        logger.error('Failed to get match by id', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          matchId,
          userId,
        });
        throw error;
      }
    },

    getConversationHistory: async (
      userId: string,
      matchId?: string,
    ): Promise<{
      messages: Message[];
      total: number;
    }> => {
      try {
        let query = 'SELECT * FROM messages WHERE userId = ?';
        const params: any[] = [userId];

        if (matchId) {
          query += ' AND matchId = ?';
          params.push(matchId);
        }

        query += ' ORDER BY timestamp DESC';

        const messages = await db.all(query, params);
        const total = await db.get(
          'SELECT COUNT(*) as count FROM messages WHERE userId = ?' +
            (matchId ? ' AND matchId = ?' : ''),
          params,
        );

        return {
          messages: messages.map(msg => ({
            ...msg,
            used: Boolean(msg.used),
          })),
          total: total.count,
        };
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
