import {Request, Response} from 'express';
import {databaseConfig} from '../../config/database';
import {Database} from '../../db/types';
import {testContextMessages} from '../../test/testContextMessages';
import logger from '../../utils/logger';
import {isEmailAllowedToResetDatabase} from '../../utils/resetDbAllowlist';
import {AuthenticatedRequest} from './types';


export const resetDb = async (
  req: AuthenticatedRequest,
  res: Response,
  db: Database,
) => {
  try {
    // Get the user's email from the request
    const userEmail = req.user?.email;

    if (!isEmailAllowedToResetDatabase(userEmail)) {
      logger.warning('Unauthorized database reset attempt:', {userEmail});
      return res.status(403).json({error: 'Unauthorized to reset database'});
    }

    logger.info('Resetting database...');

    if (databaseConfig.type === 'firestore') {
      await db.clearDatabase();
      logger.info('Firestore database reset completed successfully', {
        userEmail,
      });
      res
        .status(200)
        .json({message: 'Firestore database reset completed successfully'});
    } else {
      // Reset all users' message counts
      await db.run('UPDATE users SET dailyMessagesUsed = 0');

      // Clear all messages
      await db.run('DELETE FROM messages');

      logger.info('Database reset complete');
      res.json({message: 'Database reset successfully'});
    }
  } catch (error) {
    logger.error('Error resetting database:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    res.status(500).json({error: 'Failed to reset database'});
  }
};

export const resetSqliteDb = async (
  _req: Request,
  res: Response,
  db: Database,
) => {
  try {
    if (databaseConfig.type === 'sqlite') {
      await db.clearDatabase();
      logger.info('SQLite database reset completed successfully');
      res
        .status(200)
        .json({message: 'SQLite database reset completed successfully'});
    } else {
      res.status(400).json({error: 'SQLite database is not enabled'});
    }
  } catch (error) {
    logger.error('Error resetting SQLite database:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    res.status(500).json({error: 'Failed to reset SQLite database'});
  }
};

export const testContext = async (
  _req: Request,
  res: Response,
  db: Database,
) => {
  try {
    // Create a test user if it doesn't exist
    const testUserId = 'test-context-user';
    const user = await db.getUser(testUserId);

    if (!user) {
      await db.run(
        'INSERT INTO users (id, email, name, plan, dailyMessagesUsed, extraMessages, lastResetDate) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          testUserId,
          'test@example.com',
          'Test Context User',
          'FREE',
          0,
          0,
          new Date().toISOString().split('T')[0],
        ],
      );
    }

    // Create a test match if it doesn't exist
    const testMatchName = 'Test Context Match';
    const testMatchPlatform = 'tinder';
    let match = await db.get(
      'SELECT * FROM matches WHERE userId = ? AND name = ? AND platform = ?',
      [testUserId, testMatchName, testMatchPlatform],
    );

    if (!match) {
      const result = await db.run(
        'INSERT INTO matches (userId, name, platform, lastUsed, hidden, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          testUserId,
          testMatchName,
          testMatchPlatform,
          new Date().toISOString(),
          0,
          new Date().toISOString(),
          new Date().toISOString(),
        ],
      );
      match = await db.get('SELECT * FROM matches WHERE id = ?', [
        result.lastID,
      ]);
    }

    if (!match) {
      throw new Error('Failed to create or retrieve test match');
    }

    // Add test messages from the test context messages file
    for (const message of testContextMessages) {
      await db.run(
        'INSERT INTO messages (userId, matchId, role, type, mode, used, content, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          testUserId,
          match.id,
          message.role,
          message.type,
          message.mode,
          message.used ? 1 : 0,
          message.content,
          new Date().toISOString(),
        ],
      );
    }

    // Get the conversation history to verify context
    const {messages: conversationHistory} = await db.getConversationHistory(
      testUserId,
      match.id.toString(),
    );

    logger.info('Test context setup completed', {
      userId: testUserId,
      matchId: match.id,
      messageCount: conversationHistory.length,
    });

    res.status(200).json({
      message: 'Test context setup completed successfully',
      userId: testUserId,
      matchId: match.id,
      messageCount: conversationHistory.length,
    });
  } catch (error) {
    logger.error('Error setting up test context:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    res.status(500).json({error: 'Failed to set up test context'});
  }
};
