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
    const {userId} = req.params;
    const {name, platform} = req.body;

    logger.debug('Attempting to add match:', {
      userId,
      name,
      platform,
      params: req.params,
      body: req.body,
      headers: req.headers,
    });

    if (!name || !platform) {
      logger.warn('Missing required fields for match:', {name, platform});
      return res.status(400).json({error: 'Missing required fields'});
    }

    // First check if user exists
    const user = await db.getUser(userId);
    logger.debug('User lookup result:', {
      userId,
      userFound: !!user,
      user: user
        ? {
            id: user.id,
            email: user.email,
            name: user.name,
            installationId: user.installationId,
          }
        : null,
    });

    if (!user) {
      logger.warn('User not found when adding match:', {
        userId,
        name,
        platform,
      });
      return res.status(404).json({error: 'User not found'});
    }

    // Check if match already exists
    const matches = await db.getMatches(userId);
    const existingMatch = matches.find(
      m => m.name === name && m.platform === platform,
    );

    logger.debug('Checking for existing match:', {
      userId,
      name,
      platform,
      existingMatchFound: !!existingMatch,
      existingMatch: existingMatch
        ? {
            id: existingMatch.id,
            name: existingMatch.name,
            platform: existingMatch.platform,
          }
        : null,
    });

    if (existingMatch) {
      logger.warn('Match already exists:', {
        userId,
        name,
        platform,
        matchId: existingMatch.id,
      });
      return res.status(409).json({error: 'Match already exists'});
    }

    // Create new match
    try {
      const match = await db.addMatch(userId, name, platform);
      logger.info('Created new match:', {
        userId,
        name,
        platform,
        matchId: match.id,
      });
      res.status(201).json(match);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('UNIQUE constraint failed')
      ) {
        logger.warn('Match already exists (constraint error):', {
          userId,
          name,
          platform,
          error: error.message,
        });
        return res.status(409).json({error: 'Match already exists'});
      }
      throw error;
    }
  } catch (error) {
    logger.error('Error creating match:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: req.params.userId,
      name: req.body.name,
      platform: req.body.platform,
    });
    res.status(500).json({error: 'Failed to create match'});
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
    const result = await db.run(
      'UPDATE matches SET lastUsed = ?, updatedAt = ? WHERE id = ? AND userId = ?',
      [new Date().toISOString(), new Date().toISOString(), matchId, userId],
    );

    if (result.changes === 0) {
      logger.warn('Match not found when updating last used', {userId, matchId});
      return res.status(404).json({error: 'Match not found'});
    }

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

    // Delete match
    await db.run('DELETE FROM matches WHERE id = ? AND userId = ?', [
      matchId,
      userId,
    ]);

    logger.info('Deleted match:', {userId, matchId});
    res.json({message: 'Match deleted successfully'});
  } catch (error) {
    logger.error('Error deleting match:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: req.params.userId,
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
    await db.run(
      'UPDATE matches SET hidden = ?, updatedAt = ? WHERE id = ? AND userId = ?',
      [true, new Date().toISOString(), matchId, userId],
    );

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
      return res.status(400).json({error: 'Missing required fields'});
    }

    // First check if user exists
    const user = await db.getUser(userId);
    if (!user) {
      return res.status(404).json({error: 'User not found'});
    }

    // Restore match
    await db.run(
      'UPDATE matches SET hidden = ?, updatedAt = ? WHERE id = ? AND userId = ?',
      [false, new Date().toISOString(), matchId, userId],
    );

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
