import {Request, Response} from 'express';
import {getDatabase} from '../db';
import logger from '../utils/logger';

export const getMatches = async (req: Request, res: Response) => {
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

    const db = await getDatabase();

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

    res.json(matches);
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

export const addMatch = async (req: Request, res: Response) => {
  try {
    const {userId} = req.params;
    const {name, platform} = req.body;
    logger.debug('Adding match', {
      userId,
      name,
      platform,
      headers: req.headers,
      cookies: req.cookies,
    });

    const db = await getDatabase();

    // First check if user exists
    const user = await db.getUser(userId);
    if (!user) {
      logger.warn('User not found when adding match', {userId, name, platform});
      return res.status(404).json({error: 'User not found'});
    }

    // Validate input
    if (!name || !platform) {
      logger.warn('Invalid input when adding match', {
        userId,
        name,
        platform,
      });
      return res.status(400).json({error: 'Name and platform are required'});
    }

    const match = await db.addMatch(userId, name, platform);

    logger.info('Successfully added match', {
      userId,
      matchId: match.id,
      name,
      platform,
    });

    res.status(201).json(match);
  } catch (error) {
    logger.error('Error adding match:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: req.params.userId,
      name: req.body.name,
      platform: req.body.platform,
    });
    res.status(500).json({error: 'Failed to add match'});
  }
};

export const updateMatchLastUsed = async (req: Request, res: Response) => {
  try {
    const {userId} = req.params;
    const {name, platform} = req.body;
    logger.debug('Updating match last used', {
      userId,
      name,
      platform,
      headers: req.headers,
      cookies: req.cookies,
    });

    const db = await getDatabase();

    // First check if user exists
    const user = await db.getUser(userId);
    if (!user) {
      logger.warn('User not found when updating match last used', {
        userId,
        name,
        platform,
      });
      return res.status(404).json({error: 'User not found'});
    }

    // Validate input
    if (!name || !platform) {
      logger.warn('Invalid input when updating match last used', {
        userId,
        name,
        platform,
      });
      return res.status(400).json({error: 'Name and platform are required'});
    }

    await db.updateMatchLastUsed(userId, name, platform);

    logger.info('Successfully updated match last used', {
      userId,
      name,
      platform,
    });

    res.status(200).json({message: 'Match last used updated'});
  } catch (error) {
    logger.error('Error updating match last used:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: req.params.userId,
      name: req.body.name,
      platform: req.body.platform,
    });
    res.status(500).json({error: 'Failed to update match last used'});
  }
};

export const deleteMatch = async (req: Request, res: Response) => {
  try {
    const {userId} = req.params;
    const {name, platform} = req.body;
    logger.debug('Deleting match', {
      userId,
      name,
      platform,
      headers: req.headers,
      cookies: req.cookies,
    });

    const db = await getDatabase();

    // First check if user exists
    const user = await db.getUser(userId);
    if (!user) {
      logger.warn('User not found when deleting match', {
        userId,
        name,
        platform,
      });
      return res.status(404).json({error: 'User not found'});
    }

    // Validate input
    if (!name || !platform) {
      logger.warn('Invalid input when deleting match', {
        userId,
        name,
        platform,
      });
      return res.status(400).json({error: 'Name and platform are required'});
    }

    await db.deleteMatch(userId, name, platform);

    logger.info('Successfully deleted match', {
      userId,
      name,
      platform,
    });

    res.status(200).json({message: 'Match deleted'});
  } catch (error) {
    logger.error('Error deleting match:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: req.params.userId,
      name: req.body.name,
      platform: req.body.platform,
    });
    res.status(500).json({error: 'Failed to delete match'});
  }
};

export const hideMatch = async (req: Request, res: Response) => {
  try {
    const {userId} = req.params;
    const {name, platform} = req.body;
    logger.debug('Hiding match', {
      userId,
      name,
      platform,
      headers: req.headers,
      cookies: req.cookies,
    });

    const db = await getDatabase();

    // First check if user exists
    const user = await db.getUser(userId);
    if (!user) {
      logger.warn('User not found when hiding match', {
        userId,
        name,
        platform,
      });
      return res.status(404).json({error: 'User not found'});
    }

    // Validate input
    if (!name || !platform) {
      logger.warn('Invalid input when hiding match', {
        userId,
        name,
        platform,
      });
      return res.status(400).json({error: 'Name and platform are required'});
    }

    await db.hideMatch(userId, name, platform);

    logger.info('Successfully hid match', {
      userId,
      name,
      platform,
    });

    res.status(200).json({message: 'Match hidden'});
  } catch (error) {
    logger.error('Error hiding match:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: req.params.userId,
      name: req.body.name,
      platform: req.body.platform,
    });
    res.status(500).json({error: 'Failed to hide match'});
  }
};

export const restoreMatch = async (req: Request, res: Response) => {
  try {
    const {userId} = req.params;
    const {name, platform} = req.body;
    logger.debug('Restoring match', {
      userId,
      name,
      platform,
      headers: req.headers,
      cookies: req.cookies,
    });

    const db = await getDatabase();

    // First check if user exists
    const user = await db.getUser(userId);
    if (!user) {
      logger.warn('User not found when restoring match', {
        userId,
        name,
        platform,
      });
      return res.status(404).json({error: 'User not found'});
    }

    // Validate input
    if (!name || !platform) {
      logger.warn('Invalid input when restoring match', {
        userId,
        name,
        platform,
      });
      return res.status(400).json({error: 'Name and platform are required'});
    }

    await db.restoreMatch(userId, name, platform);

    logger.info('Successfully restored match', {
      userId,
      name,
      platform,
    });

    res.status(200).json({message: 'Match restored'});
  } catch (error) {
    logger.error('Error restoring match:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: req.params.userId,
      name: req.body.name,
      platform: req.body.platform,
    });
    res.status(500).json({error: 'Failed to restore match'});
  }
};
