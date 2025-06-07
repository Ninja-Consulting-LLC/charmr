import {Database} from '../db/types';
import logger from '../utils/logger';

export const createSummaryService = (db: Database) => {
  const updateMatchSummary = async (
    userId: string,
    matchId: string,
    newSummary: string,
  ): Promise<void> => {
    try {
      // Update the match with the new summary
      const now = new Date().toISOString();
      await db.updateMatch(userId, matchId, {
        summary: newSummary,
        summaryLastUpdated: now,
      });
    } catch (error) {
      logger.error('Failed to update match summary', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        matchId,
      });
      throw error;
    }
  };

  const getMatchSummary = async (
    userId: string,
    matchId: string,
  ): Promise<string | undefined> => {
    try {
      const match = await db.getMatchById(userId, matchId);
      return match?.summary;
    } catch (error) {
      logger.error('Failed to get match summary', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        matchId,
      });
      return undefined;
    }
  };

  return {
    updateMatchSummary,
    getMatchSummary,
  };
};
