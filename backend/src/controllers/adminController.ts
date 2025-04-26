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
