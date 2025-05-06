import {Request, Response} from 'express';
import {getDatabase} from '../db';
import logger from '../utils/logger';

export const getUsers = async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const users = await db.all('SELECT * FROM users');
    logger.info('Fetched users:', {count: users.length});
    res.json(users);
  } catch (error) {
    logger.error('Error fetching users:', {error});
    res.status(500).json({error: 'Failed to fetch users'});
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const {id, email, name, installationId} = req.body;
    if (!id) {
      return res.status(400).json({error: 'Missing required fields'});
    }

    const db = await getDatabase();
    const user = await db.createUser(
      id,
      email,
      name,
      undefined,
      installationId,
    );
    logger.info('Created new user:', {id, email, name, installationId});
    res.status(201).json(user);
  } catch (error) {
    logger.error('Error creating user:', {error});
    res.status(500).json({error: 'Failed to create user'});
  }
};

export const getUserMessages = async (req: Request, res: Response) => {
  try {
    const {userId} = req.params;
    const db = await getDatabase();

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
      matchIds: [...new Set(messages.map(m => m.matchId))],
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

export const resetUserMessageLimit = async (req: Request, res: Response) => {
  try {
    const {userId} = req.params;
    const db = await getDatabase();

    // First check if user exists
    const user = await db.getUser(userId);
    if (!user) {
      return res.status(404).json({error: 'User not found'});
    }

    // Reset the user's message count
    await db.updateUser(userId, {
      dailyMessagesUsed: 0,
      lastResetDate: new Date().toISOString().split('T')[0],
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

export const updateUserPlan = async (req: Request, res: Response) => {
  try {
    const {userId} = req.params;
    const {plan} = req.body;

    if (!plan) {
      return res.status(400).json({error: 'Plan is required'});
    }

    const db = await getDatabase();

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
    res.json({message: 'Plan updated successfully'});
  } catch (error) {
    logger.error('Error updating user plan:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: req.params.userId,
    });
    res.status(500).json({error: 'Failed to update user plan'});
  }
};

export const clearDatabase = async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    await db.clearDatabase();
    logger.info('Database cleared by admin');
    res.json({message: 'Database cleared successfully'});
  } catch (error) {
    logger.error('Error clearing database:', {error});
    res.status(500).json({error: 'Failed to clear database'});
  }
};

export const getUser = async (req: Request, res: Response) => {
  try {
    const {userId} = req.params;
    const db = await getDatabase();

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

export const getUserByInstallationId = async (req: Request, res: Response) => {
  try {
    const {installationId} = req.params;
    const db = await getDatabase();

    const user = await db.getUserByInstallationId(installationId);
    if (!user) {
      return res.status(404).json({error: 'User not found'});
    }

    res.json(user);
  } catch (error) {
    logger.error('Error getting user by installation ID:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      installationId: req.params.installationId,
    });
    res.status(500).json({error: 'Failed to get user'});
  }
};

export const linkAnonymousUser = async (req: Request, res: Response) => {
  try {
    const {anonymousUserId, registeredUserId, installationId} = req.body;
    if (!anonymousUserId || !registeredUserId) {
      return res.status(400).json({error: 'Missing required fields'});
    }

    const db = await getDatabase();

    // Get the anonymous user's data
    const anonymousUser = await db.getUser(anonymousUserId);
    if (!anonymousUser) {
      return res.status(404).json({error: 'Anonymous user not found'});
    }

    // Get the registered user
    const registeredUser = await db.getUser(registeredUserId);
    if (!registeredUser) {
      return res.status(404).json({error: 'Registered user not found'});
    }

    // Transfer all messages from anonymous to registered user
    await db.run('UPDATE messages SET userId = ? WHERE userId = ?', [
      registeredUserId,
      anonymousUserId,
    ]);

    // Transfer any remaining extra messages
    await db.updateUser(registeredUserId, {
      extraMessages: registeredUser.extraMessages + anonymousUser.extraMessages,
      installationId: installationId || registeredUser.installationId,
    });

    // Delete the anonymous user
    await db.run('DELETE FROM users WHERE id = ?', [anonymousUserId]);

    logger.info('Linked anonymous user to registered user:', {
      anonymousUserId,
      registeredUserId,
      installationId,
    });

    res.json({message: 'User linked successfully'});
  } catch (error) {
    logger.error('Error linking users:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    res.status(500).json({error: 'Failed to link users'});
  }
};

export const getUserMessageHistory = async (req: Request, res: Response) => {
  try {
    const {userId} = req.params;
    const {startDate, endDate} = req.query;
    const db = await getDatabase();

    // First check if user exists
    const user = await db.getUser(userId);
    if (!user) {
      return res.status(404).json({error: 'User not found'});
    }

    // Get messages with their costs
    const messages = await db.all(
      `SELECT m.*, mc.*
       FROM messages m
       LEFT JOIN message_costs mc ON m.id = mc.messageId
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

    // Get total costs
    const costs = await db.getTotalCosts(
      userId,
      startDate as string,
      endDate as string,
    );

    logger.info('Fetched message history for user:', {
      userId,
      messageCount: messages.length,
      totalCost: costs.totalCost,
      totalTokens: costs.totalTokens,
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
        dailyMessagesUsed: user.dailyMessagesUsed,
        extraMessages: user.extraMessages,
      },
      messages,
      costs,
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

export const getMessageCosts = async (req: Request, res: Response) => {
  try {
    const {userId} = req.params;
    const {startDate, endDate} = req.query;
    const db = await getDatabase();

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

export const getUserInfo = async (req: Request, res: Response) => {
  try {
    const {userId} = req.params;
    const {startDate, endDate} = req.query;
    const db = await getDatabase();

    // First check if user exists
    const user = await db.getUser(userId);
    if (!user) {
      logger.warn('User not found:', {userId});
      return res.status(404).json({error: 'User not found', userId});
    }

    logger.info('Fetching user info:', {userId, startDate, endDate});

    // Get messages with their costs
    const messages = await db
      .all(
        `SELECT m.*, mc.*
       FROM messages m
       LEFT JOIN message_costs mc ON m.id = mc.messageId
       WHERE m.userId = ?
       ${startDate ? 'AND m.timestamp >= ?' : ''}
       ${endDate ? 'AND m.timestamp <= ?' : ''}
       ORDER BY m.timestamp DESC`,
        [
          userId,
          ...(startDate ? [startDate] : []),
          ...(endDate ? [endDate] : []),
        ],
      )
      .catch(error => {
        logger.error('Error fetching messages:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          userId,
        });
        throw new Error(`Failed to fetch messages: ${error.message}`);
      });

    // Get total costs
    const costs = await db
      .getTotalCosts(userId, startDate as string, endDate as string)
      .catch(error => {
        logger.error('Error fetching costs:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          userId,
        });
        throw new Error(`Failed to fetch costs: ${error.message}`);
      });

    // Get unique match IDs and their message counts
    const matchStats = await db
      .all(
        `SELECT matchId, COUNT(*) as messageCount
       FROM messages
       WHERE userId = ?
       ${startDate ? 'AND timestamp >= ?' : ''}
       ${endDate ? 'AND timestamp <= ?' : ''}
       GROUP BY matchId
       ORDER BY messageCount DESC`,
        [
          userId,
          ...(startDate ? [startDate] : []),
          ...(endDate ? [endDate] : []),
        ],
      )
      .catch(error => {
        logger.error('Error fetching match stats:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          userId,
        });
        throw new Error(`Failed to fetch match stats: ${error.message}`);
      });

    // Calculate daily message usage
    const dailyUsage = await db
      .all(
        `SELECT
         date(timestamp) as date,
         COUNT(*) as messageCount,
         SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as userMessages,
         SUM(CASE WHEN role = 'assistant' THEN 1 ELSE 0 END) as assistantMessages
       FROM messages
       WHERE userId = ?
       ${startDate ? 'AND timestamp >= ?' : ''}
       ${endDate ? 'AND timestamp <= ?' : ''}
       GROUP BY date(timestamp)
       ORDER BY date DESC`,
        [
          userId,
          ...(startDate ? [startDate] : []),
          ...(endDate ? [endDate] : []),
        ],
      )
      .catch(error => {
        logger.error('Error fetching daily usage:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          userId,
        });
        throw new Error(`Failed to fetch daily usage: ${error.message}`);
      });

    logger.info('Fetched comprehensive user info:', {
      userId,
      messageCount: messages.length,
      matchCount: matchStats.length,
      totalCost: costs.totalCost,
      totalTokens: costs.totalTokens,
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
        totalCost: costs.totalCost,
        totalTokens: costs.totalTokens,
        dailyUsage,
        matchStats,
      },
      messages,
      costs,
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
