import {getDatabase} from '../db';
import {Database} from '../db/types';
import {SubscriptionTier} from '../types/enums';

describe('Match Integration Tests', () => {
  let db: Database;
  const testUser = {
    id: 'test-user-integration',
    email: 'test@integration.com',
    name: 'Test User',
    plan: SubscriptionTier.FREE,
  };

  beforeAll(async () => {
    db = await getDatabase();
    // Create test user
    await db.createUser({
      id: testUser.id,
      email: testUser.email,
      name: testUser.name,
      plan: testUser.plan,
    });
  });

  afterAll(async () => {
    // Clean up test data
    await db.run('DELETE FROM matches WHERE userId = ?', [testUser.id]);
    await db.run('DELETE FROM users WHERE id = ?', [testUser.id]);
  });

  it('should create a new match', async () => {
    const match = await db.addMatch(testUser.id, 'Sarah', 'tinder');
    expect(match).toBeDefined();
    expect(match.userId).toBe(testUser.id);
    expect(match.name).toBe('Sarah');
    expect(match.platform).toBe('tinder');
    expect(match.hidden).toBe(0);
  });

  it('should get matches for a user', async () => {
    const matches = await db.getMatches(testUser.id);
    expect(matches).toHaveLength(1);
    expect(matches[0].name).toBe('Sarah');
  });

  it('should hide a match', async () => {
    await db.hideMatch(testUser.id, 'Sarah', 'tinder');
    const matches = await db.getMatches(testUser.id);
    expect(matches).toHaveLength(0); // Hidden match should not be returned

    const allMatches = await db.getMatches(testUser.id, true);
    expect(allMatches).toHaveLength(1);
    expect(allMatches[0].hidden).toBe(1);
  });

  it('should restore a hidden match', async () => {
    await db.restoreMatch(testUser.id, 'Sarah', 'tinder');
    const matches = await db.getMatches(testUser.id);
    expect(matches).toHaveLength(1);
    expect(matches[0].hidden).toBe(0);
  });

  it('should update match last used timestamp', async () => {
    const initialMatches = await db.getMatches(testUser.id);
    const beforeUpdate = new Date(initialMatches[0].lastUsed!).getTime();
    await db.updateMatchLastUsed(testUser.id, 'Sarah', 'tinder');

    const updatedMatches = await db.getMatches(testUser.id);
    const afterUpdate = new Date(updatedMatches[0].lastUsed!).getTime();
    expect(afterUpdate).toBeGreaterThan(beforeUpdate);
  });

  it('should delete a match', async () => {
    const matches = await db.getMatches(testUser.id);
    const matchId = matches[0].id.toString();
    await db.deleteMatch(testUser.id, matchId);
    const remainingMatches = await db.getMatches(testUser.id, true);
    expect(remainingMatches).toHaveLength(0);
  });

  it('should handle multiple matches', async () => {
    // Add multiple matches
    await db.addMatch(testUser.id, 'Emma', 'bumble');
    await db.addMatch(testUser.id, 'Lucy', 'hinge');
    await db.addMatch(testUser.id, 'Anna', 'tinder');

    const matches = await db.getMatches(testUser.id);
    expect(matches).toHaveLength(3);

    // Hide one match
    await db.hideMatch(testUser.id, 'Emma', 'bumble');
    const visibleMatches = await db.getMatches(testUser.id);
    expect(visibleMatches).toHaveLength(2);

    const allMatches = await db.getMatches(testUser.id, true);
    expect(allMatches).toHaveLength(3);
  });

  it('should enforce unique constraint on matches', async () => {
    await expect(db.addMatch(testUser.id, 'Lucy', 'hinge')).rejects.toThrow();
  });
});
