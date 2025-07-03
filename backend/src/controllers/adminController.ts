import {Request, Response} from 'express';
import {databaseConfig} from '../config/database';
import {Database, User} from '../db/types';
import {testContextMessages} from '../test/testContextMessages';
import {SubscriptionTier} from '../types/enums';
import logger from '../utils/logger';

// Extend Express Request type to include user
interface AuthenticatedRequest extends Request {
  user?: {
    email: string;
  };
}

export const getUsers = async (req: Request, res: Response, db: Database) => {
  try {
    const users = await db.all('SELECT * FROM users');
    logger.info('Fetched users:', {count: users.length});
    res.json(users);
  } catch (error) {
    logger.error('Error fetching users:', {error});
    res.status(500).json({error: 'Failed to fetch users'});
  }
};

export const createUser = async (
  db: Database,
  user: {
    id: string;
    email: string;
    name: string;
    plan?: SubscriptionTier;
    installationId?: string;
  },
): Promise<User | null> => {
  try {
    return await db.createUser(user);
  } catch (error) {
    logger.error('Error creating user:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return null;
  }
};

export const getUserMessages = async (
  req: Request,
  res: Response,
  db: Database,
) => {
  try {
    const {userId} = req.params;

    // First check if user exists
    const user = await db.getUser(userId);
    if (!user) {
      return res.status(404).json({error: 'User not found'});
    }

    // Get all messages for the user with full details
    const messages = await db.all(
      `SELECT id, userId, matchId, role, content, timestamp
       FROM messages
       WHERE userId = ?
       ORDER BY timestamp DESC`,
      [userId],
    );

    logger.info('Fetched messages for user:', {
      userId,
      count: messages.length,
      matchIds: [...new Set(messages.map((m: {matchId: string}) => m.matchId))],
    });

    // Set headers to prevent caching
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.json(messages);
  } catch (error) {
    logger.error('Error fetching user messages:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: req.params.userId,
    });
    res.status(500).json({error: 'Failed to fetch user messages'});
  }
};

export const resetUserMessageLimit = async (
  req: Request,
  res: Response,
  db: Database,
) => {
  try {
    const {userId} = req.params;

    // First check if user exists
    const user = await db.getUser(userId);
    if (!user) {
      return res.status(404).json({error: 'User not found'});
    }

    // Reset the user's message count
    await db.updateUser(userId, {
      dailyMessagesUsed: 0,
      lastResetDate: new Date().toISOString(),
    });

    // Fetch the updated user data to ensure consistency
    const updatedUser = await db.getUser(userId);
    if (!updatedUser) {
      throw new Error('Failed to fetch updated user data');
    }

    logger.info('Reset message limit for user:', {userId});
    res.json({
      message: 'Message limit reset successfully',
      user: {
        dailyMessagesUsed: updatedUser.dailyMessagesUsed,
        lastResetDate: updatedUser.lastResetDate,
        extraMessages: updatedUser.extraMessages,
      },
    });
  } catch (error) {
    logger.error('Error resetting message limit:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: req.params.userId,
    });
    res.status(500).json({error: 'Failed to reset message limit'});
  }
};

export const updateUserPlan = async (
  req: Request,
  res: Response,
  db: Database,
) => {
  try {
    const {userId} = req.params;
    const {plan} = req.body;

    if (!plan) {
      return res.status(400).json({error: 'Plan is required'});
    }

    // First check if user exists
    const user = await db.getUser(userId);
    if (!user) {
      return res.status(404).json({error: 'User not found'});
    }

    // Update the user's plan
    await db.updateUser(userId, {
      plan,
    });

    logger.info('Updated user plan:', {userId, plan});
    res.status(200).json({message: 'Plan updated successfully'});
  } catch (error) {
    logger.error('Error updating user plan:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: req.params.userId,
    });
    res.status(500).json({error: 'Failed to update user plan'});
  }
};

export const getUser = async (req: Request, res: Response, db: Database) => {
  try {
    const {userId} = req.params;

    const user = await db.getUser(userId);
    if (!user) {
      return res.status(404).json({error: 'User not found'});
    }

    res.json(user);
  } catch (error) {
    logger.error('Error getting user:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: req.params.userId,
    });
    res.status(500).json({error: 'Failed to get user'});
  }
};

export const getUserByInstallationId = async (
  req: Request,
  res: Response,
  db: Database,
) => {
  try {
    const {installationId} = req.params;

    const user = await db.getUserByInstallationId(installationId);
    if (!user) {
      return res.status(404).json({error: 'User not found'});
    }

    res.status(200).json(user);
  } catch (error) {
    logger.error('Error getting user by installation ID:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      installationId: req.params.installationId,
    });
    res.status(500).json({error: 'Failed to get user'});
  }
};

export const linkAnonymousUser = async (
  req: Request,
  res: Response,
  db: Database,
) => {
  try {
    const {anonymousUserId, registeredUserId, installationId} = req.body;
    logger.info('Starting user linking process', {
      anonymousUserId,
      registeredUserId,
      installationId,
    });

    if (!anonymousUserId || !registeredUserId) {
      logger.warning('Missing required fields for user linking', {
        hasAnonymousUserId: !!anonymousUserId,
        hasRegisteredUserId: !!registeredUserId,
      });
      return res.status(400).json({error: 'Missing required fields'});
    }

    // Get the anonymous user's data
    const anonymousUser = await db.getUser(anonymousUserId);
    if (!anonymousUser) {
      logger.warning('Anonymous user not found during linking', {
        anonymousUserId,
        registeredUserId,
      });
      return res.status(404).json({error: 'Anonymous user not found'});
    }
    logger.info('Found anonymous user', {
      anonymousUserId,
      anonymousUserEmail: anonymousUser.email,
      anonymousUserInstallationId: anonymousUser.installationId,
    });

    // Get the registered user
    const registeredUser = await db.getUser(registeredUserId);
    if (!registeredUser) {
      logger.warning('Registered user not found during linking', {
        anonymousUserId,
        registeredUserId,
      });
      return res.status(404).json({error: 'Registered user not found'});
    }
    logger.info('Found registered user', {
      registeredUserId,
      registeredUserEmail: registeredUser.email,
      registeredUserInstallationId: registeredUser.installationId,
    });

    // Transfer all messages from anonymous to registered user
    logger.info('Transferring messages from anonymous to registered user', {
      anonymousUserId,
      registeredUserId,
    });
    await db.run('UPDATE messages SET userId = ? WHERE userId = ?', [
      registeredUserId,
      anonymousUserId,
    ]);

    // Transfer any remaining extra messages
    const newExtraMessages =
      registeredUser.extraMessages + anonymousUser.extraMessages;
    logger.info('Transferring extra messages', {
      anonymousUserId,
      registeredUserId,
      anonymousExtraMessages: anonymousUser.extraMessages,
      registeredExtraMessages: registeredUser.extraMessages,
      newTotalExtraMessages: newExtraMessages,
    });
    await db.updateUser(registeredUserId, {
      extraMessages: newExtraMessages,
      installationId: installationId || registeredUser.installationId,
    });

    // Skip deleting the anonymous user for now
    logger.info('Skipping anonymous user deletion as requested', {
      anonymousUserId,
      registeredUserId,
    });

    logger.info('Successfully linked anonymous user to registered user', {
      anonymousUserId,
      registeredUserId,
      installationId,
      transferredExtraMessages: newExtraMessages,
    });

    // --- PATCH: Use Firestore linking if configured ---
    if (databaseConfig.type === 'firestore') {
      const {
        FirestoreUserRepository,
      } = require('../db/repositories/firestoreUserRepository');
      const repo = new FirestoreUserRepository();
      await repo.linkUsers(anonymousUserId, registeredUserId);
      return res.json({message: 'User linked successfully (firestore)'});
    }
    // --- END PATCH ---

    res.json({message: 'User linked successfully'});
  } catch (error) {
    logger.error('Error linking users:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      anonymousUserId: req.body.anonymousUserId,
      registeredUserId: req.body.registeredUserId,
      installationId: req.body.installationId,
    });
    res.status(500).json({error: 'Failed to link users'});
  }
};

export const getUserMessageHistory = async (
  req: Request,
  res: Response,
  db: Database,
) => {
  try {
    const {userId} = req.params;
    const {startDate, endDate} = req.query;

    // First check if user exists
    const user = await db.getUser(userId);
    if (!user) {
      return res.status(404).json({error: 'User not found'});
    }

    // Get messages with their embedded cost data
    const messages = await db.all(
      `SELECT m.*,
              COALESCE(m.model, '') as model,
              COALESCE(m.promptTokens, 0) as promptTokens,
              COALESCE(m.completionTokens, 0) as completionTokens,
              COALESCE(m.totalTokens, 0) as totalTokens,
              COALESCE(m.inputCost, 0) as inputCost,
              COALESCE(m.outputCost, 0) as outputCost,
              COALESCE(m.totalCost, 0) as totalCost,
              COALESCE(m.costTimestamp, '') as costTimestamp
       FROM messages m
       WHERE m.userId = ?
       ${startDate ? 'AND m.timestamp >= ?' : ''}
       ${endDate ? 'AND m.timestamp <= ?' : ''}
       ORDER BY m.timestamp DESC`,
      [
        userId,
        ...(startDate ? [startDate] : []),
        ...(endDate ? [endDate] : []),
      ],
    );

    // Get user cost totals from user-level tracking
    const userCosts = await db.getUserCosts(userId);

    // Calculate message stats
    const userMessages = messages.filter(
      (m: {role: string}) => m.role === 'user',
    ).length;
    const assistantMessages = messages.filter(
      (m: {role: string}) => m.role === 'assistant',
    ).length;
    const systemMessages = messages.filter(
      (m: {role: string}) => m.role === 'system',
    ).length;

    // Group messages by matchId for stats
    const matchStats = messages.reduce((acc: Record<string, any>, msg: any) => {
      const matchId = msg.matchId || 'no-match';
      if (!acc[matchId]) {
        acc[matchId] = {
          matchId,
          messageCount: 0,
          userMessages: 0,
          assistantMessages: 0,
          systemMessages: 0,
        };
      }
      acc[matchId].messageCount++;
      acc[matchId][`${msg.role}Messages`]++;
      return acc;
    }, {});

    logger.info('Fetched message history for user:', {
      userId,
      messageCount: messages.length,
      userMessages,
      assistantMessages,
      systemMessages,
      userTotalCost: userCosts.totalCost,
      userTotalTokens: userCosts.totalTokens,
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        dailyMessagesUsed: user.dailyMessagesUsed,
        extraMessages: user.extraMessages,
        lastResetDate: user.lastResetDate,
        installationId: user.installationId,
        totalCost: userCosts.totalCost,
        totalTokens: userCosts.totalTokens,
        lastCostUpdate: userCosts.lastCostUpdate,
      },
      usage: {
        totalMessages: userMessages,
        totalCost: userCosts.totalCost,
        totalTokens: userCosts.totalTokens,
        dailyUsage: [
          {
            date: new Date().toISOString().split('T')[0],
            messageCount: userMessages,
            userMessages,
            assistantMessages,
            systemMessages,
          },
        ],
        matchStats: Object.values(matchStats),
      },
      messages,
      costs: userCosts,
    });
  } catch (error) {
    logger.error('Error fetching user message history:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: req.params.userId,
    });
    res.status(500).json({error: 'Failed to fetch user message history'});
  }
};

export const getMessageCosts = async (
  req: Request,
  res: Response,
  db: Database,
) => {
  try {
    const {userId} = req.params;
    const {startDate, endDate} = req.query;

    // First check if user exists
    const user = await db.getUser(userId);
    if (!user) {
      return res.status(404).json({error: 'User not found'});
    }

    // Get detailed cost breakdown
    const costs = await db.getMessageCosts(
      userId,
      startDate as string,
      endDate as string,
    );

    // Get total costs
    const totals = await db.getTotalCosts(
      userId,
      startDate as string,
      endDate as string,
    );

    logger.info('Fetched message costs for user:', {
      userId,
      costCount: costs.length,
      totalCost: totals.totalCost,
      totalTokens: totals.totalTokens,
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
      },
      costs,
      totals,
    });
  } catch (error) {
    logger.error('Error fetching message costs:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: req.params.userId,
    });
    res.status(500).json({error: 'Failed to fetch message costs'});
  }
};

export const getUserInfo = async (
  req: Request,
  res: Response,
  db: Database,
) => {
  try {
    const {userId} = req.params;
    const {startDate, endDate} = req.query;

    // First check if user exists
    const user = await db.getUser(userId);
    if (!user) {
      logger.warning('User not found:', {userId});
      return res.status(404).json({error: 'User not found', userId});
    }

    logger.info('Fetching user info:', {userId, startDate, endDate});

    // Get messages with their embedded cost data
    const messages = await db.all(
      `SELECT
        m.id, m.userId, m.matchId, m.role, m.content, m.timestamp,
        COALESCE(m.model, '') as model,
        COALESCE(m.promptTokens, 0) as promptTokens,
        COALESCE(m.completionTokens, 0) as completionTokens,
        COALESCE(m.totalTokens, 0) as totalTokens,
        COALESCE(m.inputCost, 0) as inputCost,
        COALESCE(m.outputCost, 0) as outputCost,
        COALESCE(m.totalCost, 0) as totalCost,
        COALESCE(m.costTimestamp, '') as costTimestamp
       FROM messages m
       WHERE m.userId = ?
       ${startDate ? 'AND m.timestamp >= ?' : ''}
       ${endDate ? 'AND m.timestamp <= ?' : ''}
       ORDER BY m.timestamp DESC`,
      [
        userId,
        ...(startDate ? [startDate] : []),
        ...(endDate ? [endDate] : []),
      ],
    );

    logger.info('Raw messages from database:', {
      messages: messages.map((msg: any) => ({
        id: msg.id,
        timestamp: msg.timestamp,
        role: msg.role,
        model: msg.model,
        totalCost: msg.totalCost,
      })),
    });

    // Calculate total message counts
    const totalUserMessages = messages.filter(
      (m: {role: string}) => m.role === 'user',
    ).length;
    const totalAssistantMessages = messages.filter(
      (m: {role: string}) => m.role === 'assistant',
    ).length;
    const totalSystemMessages = messages.filter(
      (m: {role: string}) => m.role === 'system',
    ).length;

    // Get match stats
    const matchStats = await db.all(
      `SELECT
        matchId,
        COUNT(*) as messageCount,
        SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as userMessages,
        SUM(CASE WHEN role = 'assistant' THEN 1 ELSE 0 END) as assistantMessages,
        SUM(CASE WHEN role = 'system' THEN 1 ELSE 0 END) as systemMessages
       FROM messages
       WHERE userId = ?
       GROUP BY matchId
       ORDER BY messageCount DESC`,
      [userId],
    );

    // Calculate daily message usage
    const dailyUsage = await db.all(
      `SELECT
         date(timestamp) as date,
         COUNT(*) as messageCount,
         SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as userMessages,
         SUM(CASE WHEN role = 'assistant' THEN 1 ELSE 0 END) as assistantMessages,
         SUM(CASE WHEN role = 'system' THEN 1 ELSE 0 END) as systemMessages
       FROM messages
       WHERE userId = ?
       GROUP BY date(timestamp)
       ORDER BY date DESC`,
      [userId],
    );

    // Get user cost totals from user-level tracking
    const userCosts = await db.getUserCosts(userId);

    // Also calculate costs from embedded message data for comparison
    const [embeddedCosts] = await db.all(
      `SELECT
         COALESCE(SUM(m.totalCost), 0) as totalCost,
         COALESCE(SUM(m.totalTokens), 0) as totalTokens,
         COUNT(DISTINCT CASE WHEN m.totalCost > 0 THEN m.id END) as messageCount
       FROM messages m
       WHERE m.userId = ?
       ${startDate ? 'AND m.timestamp >= ?' : ''}
       ${endDate ? 'AND m.timestamp <= ?' : ''}`,
      [
        userId,
        ...(startDate ? [startDate] : []),
        ...(endDate ? [endDate] : []),
      ],
    );

    logger.info('Cost data from database:', {
      userCosts,
      embeddedCosts,
    });

    logger.info('Fetched comprehensive user info:', {
      userId,
      messageCount: messages.length,
      userMessages: totalUserMessages,
      assistantMessages: totalAssistantMessages,
      systemMessages: totalSystemMessages,
      matchCount: matchStats.length,
      userTotalCost: userCosts.totalCost,
      userTotalTokens: userCosts.totalTokens,
      embeddedTotalCost: embeddedCosts?.totalCost || 0,
      embeddedTotalTokens: embeddedCosts?.totalTokens || 0,
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        dailyMessagesUsed: user.dailyMessagesUsed,
        extraMessages: user.extraMessages,
        lastResetDate: user.lastResetDate,
        installationId: user.installationId,
      },
      usage: {
        totalMessages: messages.length,
        userMessages: totalUserMessages,
        assistantMessages: totalAssistantMessages,
        systemMessages: totalSystemMessages,
        totalCost: userCosts.totalCost,
        totalTokens: userCosts.totalTokens,
        dailyUsage,
        matchStats,
      },
      messages: messages.map((msg: any) => ({
        id: msg.id,
        userId: msg.userId,
        matchId: msg.matchId,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        model: msg.model || '',
        promptTokens: msg.promptTokens || 0,
        completionTokens: msg.completionTokens || 0,
        totalTokens: msg.totalTokens || 0,
        inputCost: msg.inputCost || 0,
        outputCost: msg.outputCost || 0,
        totalCost: msg.totalCost || 0,
      })),
      costs: userCosts,
    });
  } catch (error) {
    logger.error('Error fetching user info:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: req.params.userId,
    });
    res.status(500).json({
      error: 'Failed to fetch user info',
      details: error instanceof Error ? error.message : 'Unknown error',
      userId: req.params.userId,
    });
  }
};

export const updateUser = async (req: Request, res: Response, db: Database) => {
  try {
    const {userId} = req.params;
    const {name, email} = req.body;

    if (!name && !email) {
      return res.status(400).json({error: 'No fields to update'});
    }

    // First check if user exists
    const user = await db.getUser(userId);
    if (!user) {
      return res.status(404).json({error: 'User not found'});
    }

    // Prepare update fields
    const updateFields: any = {};
    if (name) updateFields.name = name;
    if (email) updateFields.email = email;

    await db.updateUser(userId, updateFields);
    const updatedUser = await db.getUser(userId);
    res.json(updatedUser);
  } catch (error) {
    logger.error('Error updating user:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: req.params.userId,
    });
    res.status(500).json({error: 'Failed to update user'});
  }
};

export const deleteUser = async (req: Request, res: Response, db: Database) => {
  try {
    const {userId} = req.params;

    // First check if user exists
    const user = await db.getUser(userId);
    if (!user) {
      return res.status(404).json({error: 'User not found'});
    }

    // Mark user as deleted
    await db.deleteUser(userId);

    logger.info('User marked as deleted:', {userId});
    res.status(200).json({message: 'User deleted successfully'});
  } catch (error) {
    logger.error('Error deleting user:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: req.params.userId,
    });
    res.status(500).json({error: 'Failed to delete user'});
  }
};

export const resetDb = async (
  req: AuthenticatedRequest,
  res: Response,
  db: Database,
) => {
  try {
    // Get the user's email from the request
    const userEmail = req.user?.email;

    // Check if the user is authorized
    if (userEmail !== 'mike.doubintchik@gmail.com') {
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
  req: Request,
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
  req: Request,
  res: Response,
  db: Database,
) => {
  try {
    // Create a test user if it doesn't exist
    const testUserId = 'test-context-user';
    let user = await db.getUser(testUserId);

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
