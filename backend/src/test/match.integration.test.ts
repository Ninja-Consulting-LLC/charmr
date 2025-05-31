import {getDatabase} from '../db';
import {SubscriptionTier} from '../types/enums';

describe('Match Integration Tests', () => {
  let db: Awaited<ReturnType<typeof getDatabase>>;
  let userId: string;
  let matchId: string;

  beforeAll(async () => {
    db = await getDatabase();
    // Create a test user
    const user = await db.createUser({
      id: 'test-user',
      email: 'test@example.com',
      name: 'Test User',
      plan: SubscriptionTier.FREE,
    });
    if (!user) {
      throw new Error('Failed to create test user');
    }
    userId = user.id;
  });

  afterAll(async () => {
    // Clean up test data
    await db.clearDatabase();
  });

  it('should create a new match', async () => {
    const match = await db.addMatch(userId, {
      userId,
      name: 'Test Match',
      platform: 'test',
      lastUsed: new Date().toISOString(),
      hidden: false,
      deleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    expect(match).toBeDefined();
    expect(match.userId).toBe(userId);
    expect(match.name).toBe('Test Match');
    expect(match.platform).toBe('test');
    expect(match.hidden).toBe(false);

    matchId = match.id.toString();
  });

  it('should get matches for a user', async () => {
    const matches = await db.getMatches(userId);

    expect(matches).toBeDefined();
    expect(Array.isArray(matches)).toBe(true);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].userId).toBe(userId);
  });

  it('should get a match by ID', async () => {
    const match = await db.getMatchById(userId, matchId);

    expect(match).toBeDefined();
    expect(match?.id.toString()).toBe(matchId);
    expect(match?.userId).toBe(userId);
    expect(match?.name).toBe('Test Match');
  });

  it('should update match last used', async () => {
    const beforeUpdate = await db.getMatchById(userId, matchId);
    const beforeLastUsed = beforeUpdate?.lastUsed;

    await db.updateMatchLastUsed(userId, matchId);

    const afterUpdate = await db.getMatchById(userId, matchId);
    expect(afterUpdate?.lastUsed).not.toBe(beforeLastUsed);
  });

  it('should hide a match', async () => {
    await db.hideMatch(userId, matchId);

    const match = await db.getMatchById(userId, matchId);
    expect(match?.hidden).toBe(true);
  });

  it('should restore a hidden match', async () => {
    await db.restoreMatch(userId, matchId);

    const match = await db.getMatchById(userId, matchId);
    expect(match?.hidden).toBe(false);
  });

  it('should delete a match', async () => {
    await db.deleteMatch(userId, matchId);

    const match = await db.getMatchById(userId, matchId);
    expect(match).toBeNull();
  });

  it('should handle multiple matches', async () => {
    // Add multiple matches
    const match1 = await db.addMatch(userId, {
      userId,
      name: 'Emma',
      platform: 'bumble',
      lastUsed: new Date().toISOString(),
      hidden: false,
      deleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const match2 = await db.addMatch(userId, {
      userId,
      name: 'Lucy',
      platform: 'hinge',
      lastUsed: new Date().toISOString(),
      hidden: false,
      deleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const match3 = await db.addMatch(userId, {
      userId,
      name: 'Anna',
      platform: 'tinder',
      lastUsed: new Date().toISOString(),
      hidden: false,
      deleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const matches = await db.getMatches(userId);
    expect(matches).toHaveLength(3);

    // Hide one match
    await db.hideMatch(userId, match1.id.toString());
    const visibleMatches = await db.getMatches(userId);
    expect(visibleMatches).toHaveLength(2);

    const allMatches = await db.getMatches(userId, true);
    expect(allMatches).toHaveLength(3);
  });

  it('should enforce unique constraint on matches', async () => {
    await expect(
      db.addMatch(userId, {
        userId,
        name: 'Lucy',
        platform: 'hinge',
        lastUsed: new Date().toISOString(),
        hidden: false,
        deleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    ).rejects.toThrow();
  });
});
