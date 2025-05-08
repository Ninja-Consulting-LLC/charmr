import {matchService} from '../services/matchService';

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
    console.log('[matchUtils] Getting matches', {includeHidden});
    const matches = await matchService.getMatches(includeHidden);
    console.log('[matchUtils] Got matches', {count: matches.length});
    return matches;
  } catch (error) {
    console.error('[matchUtils] Error getting matches:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
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
    console.log('[matchUtils] Adding match', {name, platform});
    const match = await matchService.addMatch(name, platform);
    console.log('[matchUtils] Added match', {match});
    return match;
  } catch (error) {
    console.error('[matchUtils] Error adding match:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
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
    console.log('[matchUtils] Deleting match', {name, platform});
    await matchService.deleteMatch(name, platform);
    console.log('[matchUtils] Deleted match', {name, platform});
    return true;
  } catch (error) {
    console.error('[matchUtils] Error deleting match:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
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
    console.log('[matchUtils] Hiding match', {name, platform});
    await matchService.hideMatch(name, platform);
    console.log('[matchUtils] Hidden match', {name, platform});
    return true;
  } catch (error) {
    console.error('[matchUtils] Error hiding match:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
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
    console.log('[matchUtils] Restoring match', {name, platform});
    await matchService.restoreMatch(name, platform);
    console.log('[matchUtils] Restored match', {name, platform});
    return true;
  } catch (error) {
    console.error('[matchUtils] Error restoring match:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
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
    console.log('[matchUtils] Updating match last used', {name, platform});
    await matchService.updateMatchLastUsed(name, platform);
    console.log('[matchUtils] Updated match last used', {name, platform});
    return true;
  } catch (error) {
    console.error('[matchUtils] Error updating match last used:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
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
