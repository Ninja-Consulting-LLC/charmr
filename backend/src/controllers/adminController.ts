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
    const {id, email, name} = req.body;
    if (!id || !email || !name) {
      return res.status(400).json({error: 'Missing required fields'});
    }

    const db = await getDatabase();
    await db.run(
      'INSERT INTO users (id, email, name, plan, dailyMessagesUsed, dailyMessageLimit, extraMessages, lastResetDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        email,
        name,
        'free', // default plan
        0, // dailyMessagesUsed
        5, // dailyMessageLimit for free plan
        0, // extraMessages
        new Date().toISOString().split('T')[0], // lastResetDate
      ],
    );
    logger.info('Created new user:', {id, email, name});
    res.status(201).json({
      id,
      email,
      name,
      plan: 'free',
      dailyMessagesUsed: 0,
      dailyMessageLimit: 5,
      extraMessages: 0,
      lastResetDate: new Date().toISOString().split('T')[0],
    });
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

    logger.info('Reset message limit for user:', {userId});
    res.json({message: 'Message limit reset successfully'});
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
