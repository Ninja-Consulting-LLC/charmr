import {Request, Response} from 'express';
import {Database} from '../db/types';
import logger from '../utils/logger';

export const getMatches = async (req: Request, res: Response, db: Database) => {
  try {
    const {userId} = req.params;
    const {includeHidden} = req.query;
    logger.debug('Getting matches', {
      userId,
      includeHidden,
      includeHiddenType: typeof includeHidden,
      includeHiddenValue: includeHidden === 'true',
      headers: req.headers,
      cookies: req.cookies,
    });

    // First check if user exists
    const user = await db.getUser(userId);
    if (!user) {
      logger.warn('User not found when getting matches', {userId});
      return res.status(404).json({error: 'User not found'});
    }

    const matches = await db.getMatches(userId, includeHidden === 'true');
    logger.debug('Database query result:', {
      matchesCount: matches.length,
      hiddenMatchesCount: matches.filter(m => m.hidden).length,
      includeHidden: includeHidden === 'true',
    });

    logger.info('Successfully fetched matches', {
      userId,
      count: matches.length,
      includeHidden,
    });

    // Always return 200 with matches array (empty if no matches)
    res.status(200).json(matches);
  } catch (error) {
    logger.error('Error fetching matches:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: req.params.userId,
      includeHidden: req.query.includeHidden,
    });
    res.status(500).json({error: 'Failed to fetch matches'});
  }
};

export const addMatch = async (req: Request, res: Response, db: Database) => {
  try {
    // Get userId from either Firebase token or anonymous user header
    const userId =
      process.env.NODE_ENV === 'development'
        ? req.params.userId
        : req.user?.uid || req.headers['x-anonymous-user'];

    if (!userId) {
      return res.status(401).json({error: 'Unauthorized'});
    }

    // First check if user exists
    const user = await db.getUser(userId);
    if (!user) {
      return res.status(404).json({error: 'User not found'});
    }

    const {name, platform} = req.body;
    if (!name || !platform) {
      return res.status(400).json({error: 'Name and platform are required'});
    }

    const now = new Date().toISOString();
    const matchData = {
      userId,
      name,
      platform,
      lastUsed: now,
      hidden: false,
      deleted: false,
      createdAt: now,
      updatedAt: now,
    };

    const createdMatch = await db.addMatch(userId, matchData);

    res.status(201).json(createdMatch);
  } catch (error) {
    logger.error('Failed to add match', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    res.status(500).json({error: 'Failed to add match'});
  }
};

export const updateMatchLastUsed = async (
  req: Request,
  res: Response,
  db: Database,
) => {
  try {
    const {userId} = req.params;
    const {matchId} = req.body;

    if (!matchId) {
      return res.status(400).json({error: 'Missing required fields'});
    }

    // First check if user exists
    const user = await db.getUser(userId);
    if (!user) {
      return res.status(404).json({error: 'User not found'});
    }

    // Update match last used
    await db.updateMatchLastUsed(userId, matchId);

    logger.info('Updated match last used:', {userId, matchId});
    res.json({message: 'Match updated successfully'});
  } catch (error) {
    logger.error('Error updating match:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: req.params.userId,
    });
    res.status(500).json({error: 'Failed to update match'});
  }
};

export const deleteMatch = async (
  req: Request,
  res: Response,
  db: Database,
) => {
  try {
    const {matchId} = req.params;
    const userId =
      process.env.NODE_ENV === 'development'
        ? req.params.userId
        : req.user?.uid;

    if (!userId) {
      return res.status(401).json({error: 'Unauthorized'});
    }

    // Soft delete the match
    await db.deleteMatch(userId, matchId);

    res.status(200).json({message: 'Match deleted successfully'});
  } catch (error) {
    logger.error('Error deleting match:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    res.status(500).json({error: 'Failed to delete match'});
  }
};

export const hideMatch = async (req: Request, res: Response, db: Database) => {
  try {
    const {userId} = req.params;
    const {matchId} = req.body;

    if (!matchId) {
      return res.status(400).json({error: 'Missing required fields'});
    }

    // First check if user exists
    const user = await db.getUser(userId);
    if (!user) {
      return res.status(404).json({error: 'User not found'});
    }

    // Hide match
    await db.hideMatch(userId, matchId);

    logger.info('Hidden match:', {userId, matchId});
    res.json({message: 'Match hidden successfully'});
  } catch (error) {
    logger.error('Error hiding match:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: req.params.userId,
    });
    res.status(500).json({error: 'Failed to hide match'});
  }
};

export const restoreMatch = async (
  req: Request,
  res: Response,
  db: Database,
) => {
  try {
    const {userId} = req.params;
    const {matchId} = req.body;

    if (!matchId) {
      return res.status(400).json({error: 'Match ID is required'});
    }

    // First check if user exists
    const user = await db.getUser(userId);
    if (!user) {
      return res.status(404).json({error: 'User not found'});
    }

    // Restore match
    await db.restoreMatch(userId, matchId);

    logger.info('Restored match:', {userId, matchId});
    res.json({message: 'Match restored successfully'});
  } catch (error) {
    logger.error('Error restoring match:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: req.params.userId,
    });
    res.status(500).json({error: 'Failed to restore match'});
  }
};
