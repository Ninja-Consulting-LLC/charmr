import {matchService} from '../services/matchService';
import {logger} from './logger';

export interface Match {
  id: number;
  userId: string;
  name: string;
  platform: string;
  lastUsed: string | null;
  hidden: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getMatches(
  includeHidden: boolean = false,
): Promise<Match[]> {
  try {
    logger.match.debug('Getting matches', {includeHidden});
    const matches = await matchService.getMatches(includeHidden);
    logger.match.debug('Got matches', {count: matches.length});
    return matches;
  } catch (error) {
    logger.match.error('Error getting matches', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return [];
  }
}

export async function addMatch(
  name: string,
  platform: string,
): Promise<Match | null> {
  try {
    logger.match.debug('Adding match', {name, platform});
    const match = await matchService.addMatch(name, platform);
    logger.match.debug('Added match', {match});
    return match;
  } catch (error) {
    logger.match.error('Error adding match', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name,
      platform,
    });
    return null;
  }
}

export async function deleteMatch(
  name: string,
  platform: string,
): Promise<boolean> {
  try {
    logger.match.debug('Deleting match', {name, platform});
    await matchService.deleteMatch(name, platform);
    logger.match.debug('Deleted match', {name, platform});
    return true;
  } catch (error) {
    logger.match.error('Error deleting match', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name,
      platform,
    });
    return false;
  }
}

export async function hideMatch(
  name: string,
  platform: string,
): Promise<boolean> {
  try {
    logger.match.debug('Hiding match', {name, platform});
    await matchService.hideMatch(name, platform);
    logger.match.debug('Hidden match', {name, platform});
    return true;
  } catch (error) {
    logger.match.error('Error hiding match', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name,
      platform,
    });
    return false;
  }
}

export async function restoreMatch(
  name: string,
  platform: string,
): Promise<boolean> {
  try {
    logger.match.debug('Restoring match', {name, platform});
    await matchService.restoreMatch(name, platform);
    logger.match.debug('Restored match', {name, platform});
    return true;
  } catch (error) {
    logger.match.error('Error restoring match', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name,
      platform,
    });
    return false;
  }
}

export async function updateMatchLastUsed(
  name: string,
  platform: string,
): Promise<boolean> {
  try {
    logger.match.debug('Updating match last used', {name, platform});
    await matchService.updateMatchLastUsed(name, platform);
    logger.match.debug('Updated match last used', {name, platform});
    return true;
  } catch (error) {
    logger.match.error('Error updating match last used', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name,
      platform,
    });
    return false;
  }
}

export function generateMatchId(match: Match): string {
  return `${match.platform}::${match.name}`;
}
