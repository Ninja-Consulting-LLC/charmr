import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Match {
  name: string;
  platform: string;
  lastUsed?: number;
}

const MATCHES_STORAGE_KEY = 'matches';

export async function getMatches(): Promise<Match[]> {
  try {
    const matchesJson = await AsyncStorage.getItem(MATCHES_STORAGE_KEY);
    const matches = matchesJson ? JSON.parse(matchesJson) : [];
    // Sort by lastUsed, most recent first
    return matches.sort(
      (a: Match, b: Match) => (b.lastUsed || 0) - (a.lastUsed || 0),
    );
  } catch (error) {
    console.error('Error getting matches:', error);
    return [];
  }
}

export async function addMatch(match: Match): Promise<void> {
  try {
    const matches = await getMatches();
    matches.push({...match, lastUsed: Date.now()});
    await AsyncStorage.setItem(MATCHES_STORAGE_KEY, JSON.stringify(matches));
  } catch (error) {
    console.error('Error adding match:', error);
  }
}

export async function updateMatchLastUsed(match: Match): Promise<void> {
  try {
    const matches = await getMatches();
    const updatedMatches = matches.map(m =>
      m.name === match.name && m.platform === match.platform
        ? {...m, lastUsed: Date.now()}
        : m,
    );
    await AsyncStorage.setItem(
      MATCHES_STORAGE_KEY,
      JSON.stringify(updatedMatches),
    );
  } catch (error) {
    console.error('Error updating match:', error);
  }
}

export async function deleteMatch(match: Match): Promise<void> {
  try {
    const matches = await getMatches();
    const filteredMatches = matches.filter(
      m => m.name !== match.name || m.platform !== match.platform,
    );
    await AsyncStorage.setItem(
      MATCHES_STORAGE_KEY,
      JSON.stringify(filteredMatches),
    );
  } catch (error) {
    console.error('Error deleting match:', error);
  }
}

export function generateMatchId(match: Match): string {
  return `${match.platform}::${match.name}`;
}
