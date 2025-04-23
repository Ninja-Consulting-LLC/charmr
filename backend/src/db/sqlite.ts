import path from 'path';
import {open} from 'sqlite';
import sqlite3 from 'sqlite3';
import logger from '../utils/logger';
import {Database, User} from './types';

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
      plan TEXT NOT NULL,
      dailyMessagesUsed INTEGER NOT NULL,
      dailyMessageLimit INTEGER NOT NULL,
      extraMessages INTEGER NOT NULL,
      lastResetDate TEXT NOT NULL
    )
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

    createUser: async (
      userId: string,
      plan: string = 'free',
    ): Promise<User> => {
      try {
        const user: User = {
          id: userId,
          plan,
          dailyMessagesUsed: 0,
          dailyMessageLimit: plan === 'free' ? 5 : plan === 'plus' ? 50 : 200,
          extraMessages: 0,
          lastResetDate: new Date().toISOString().split('T')[0],
        };

        await db.run(
          'INSERT INTO users (id, plan, dailyMessagesUsed, dailyMessageLimit, extraMessages, lastResetDate) VALUES (?, ?, ?, ?, ?, ?)',
          [
            user.id,
            user.plan,
            user.dailyMessagesUsed,
            user.dailyMessageLimit,
            user.extraMessages,
            user.lastResetDate,
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

    updateUser: async (userId: string, data: Partial<User>): Promise<void> => {
      try {
        const updates = Object.entries(data)
          .map(([key]) => `${key} = ?`)
          .join(', ');
        const values = [...Object.values(data), userId];

        await db.run(`UPDATE users SET ${updates} WHERE id = ?`, values);
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
        const result = await db.run(
          `UPDATE users
           SET dailyMessagesUsed = CASE WHEN lastResetDate = ? THEN dailyMessagesUsed + 1 ELSE 1 END,
               lastResetDate = ?
           WHERE id = ? AND (dailyMessagesUsed < dailyMessageLimit OR lastResetDate != ?)`,
          [today, today, userId, today],
        );
        return (result.changes ?? 0) > 0;
      } catch (error) {
        logger.error('Failed to increment message count', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
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

    updateUserPlan: async (userId: string, plan: string): Promise<void> => {
      try {
        await db.run(
          'UPDATE users SET plan = ?, dailyMessageLimit = ? WHERE id = ?',
          [plan, plan === 'free' ? 5 : plan === 'plus' ? 50 : 200, userId],
        );
      } catch (error) {
        logger.error('Failed to update user plan', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    },
  };
};
