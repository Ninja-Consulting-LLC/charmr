import {getDatabase} from '../../backend/src/db';
import {Match} from '../../backend/src/db/types';
import {generateReply} from '../../backend/src/services/replyService';
import {MessageMode, MessageRole, MessageType} from '@charmr/shared';

jest.mock('../../backend/src/services/openaiService', () => ({
  createOpenAIService: jest.fn(() => ({
    generateReply: jest.fn().mockResolvedValue({
      reply: 'Mock integration AI reply',
      summary: '',
      error: null,
      usage: {
        prompt_tokens: 5,
        completion_tokens: 5,
        total_tokens: 10,
      },
    }),
  })),
}));

describe('Anonymous User Flow Integration Tests', () => {
  let anonymousUserId: string;
  let registeredUserId: string;
  let matchId: string;
  let db: any;

  beforeAll(async () => {
    db = await getDatabase();
  });

  beforeEach(async () => {
    await db.clearDatabase();
  });

  afterEach(async () => {
    await db.clearDatabase();
  });

  it('should create an anonymous user and generate a match', async () => {
    // Create an anonymous user
    const user = await db.createUser({
      id: 'test-anonymous-user',
      name: 'Anonymous User',
      email: 'anon@example.com',
      plan: 'free',
    });
    anonymousUserId = user.id;

    // Create a match for the anonymous user
    const now = new Date().toISOString();
    const match = await db.addMatch(anonymousUserId, {
      name: 'Test Match',
      platform: 'tinder',
      lastUsed: now,
      hidden: false,
      deleted: false,
      createdAt: now,
      updatedAt: now,
    });
    matchId = match.id.toString();

    // Verify match was created in database
    const savedMatch = await db.getMatchById(anonymousUserId, matchId);
    expect(savedMatch).toBeTruthy();
    expect(savedMatch.name).toBe('Test Match');
  });

  it('should send and receive messages', async () => {
    // Create an anonymous user
    const user = await db.createUser({
      id: 'test-anonymous-user',
      name: 'Anonymous User',
      email: 'anon@example.com',
      plan: 'free',
    });
    anonymousUserId = user.id;

    // Create a match
    const now = new Date().toISOString();
    const match = await db.addMatch(anonymousUserId, {
      name: 'Test Match',
      platform: 'tinder',
      lastUsed: now,
      hidden: false,
      deleted: false,
      createdAt: now,
      updatedAt: now,
    });
    matchId = match.id.toString();

    // Create initial message
    await db.createMessage(anonymousUserId, matchId, {
      role: MessageRole.USER,
      type: MessageType.TEXT,
      mode: MessageMode.GENERATE,
      used: false,
      content: 'Hello, this is a test message',
      timestamp: new Date().toISOString(),
    });

    // Generate reply using backend service
    const replyText = await generateReply('Hello, this is a test message');
    await db.createMessage(anonymousUserId, matchId, {
      role: MessageRole.ASSISTANT,
      type: MessageType.TEXT,
      mode: MessageMode.GENERATE,
      used: false,
      content: replyText,
      timestamp: new Date().toISOString(),
    });

    // Verify messages in database
    const messagesResult = await db.getMessages(anonymousUserId, matchId);
    const messages = messagesResult.messages;
    expect(messages.length).toBe(2);
    const byRole = Object.fromEntries(
      messages.map((m: {role: string; content: string}) => [m.role, m]),
    );
    expect(byRole[MessageRole.ASSISTANT]?.content).toBeTruthy();
    expect(byRole[MessageRole.USER]?.content).toBe(
      'Hello, this is a test message',
    );
  });

  it('should upgrade anonymous user to registered user', async () => {
    // Create an anonymous user
    const anonUser = await db.createUser({
      id: 'test-anonymous-user',
      name: 'Anonymous User',
      email: 'anon@example.com',
      plan: 'free',
    });
    anonymousUserId = anonUser.id;

    // Create a match and message
    const now = new Date().toISOString();
    const match = await db.addMatch(anonymousUserId, {
      name: 'Test Match',
      platform: 'tinder',
      lastUsed: now,
      hidden: false,
      deleted: false,
      createdAt: now,
      updatedAt: now,
    });
    matchId = match.id.toString();
    await db.createMessage(anonymousUserId, matchId, {
      role: MessageRole.USER,
      type: MessageType.TEXT,
      mode: MessageMode.GENERATE,
      used: false,
      content: 'Test message',
      timestamp: new Date().toISOString(),
    });

    // Create a registered user
    const regUser = await db.createUser({
      id: 'test-registered-user',
      name: 'Registered User',
      email: 'test@example.com',
      plan: 'free',
    });
    registeredUserId = regUser.id;

    // Link anonymous user to registered user (simulate transfer)
    await db.linkUsers(anonymousUserId, registeredUserId);

    // Verify match and messages are transferred
    const matches = await db.getMatches(registeredUserId);
    expect(matches.length).toBe(1);
    expect(matches[0].id.toString()).toBe(matchId);

    const messagesResult2 = await db.getMessages(registeredUserId, matchId);
    const messages2 = messagesResult2.messages;
    expect(messages2.length).toBe(1);
    expect(messages2[0].content).toBe('Test message');

    // Verify anonymous user is deleted
    const anon = await db.getUser(anonymousUserId);
    expect(anon).toBeNull();
  });

  it('should preserve match metadata during user upgrade', async () => {
    // Create an anonymous user
    const anonUser = await db.createUser({
      id: 'test-anonymous-user',
      name: 'Anonymous User',
      email: 'anon@example.com',
      plan: 'free',
    });
    anonymousUserId = anonUser.id;

    // Create a match with metadata
    const now = new Date().toISOString();
    const match = await db.addMatch(anonymousUserId, {
      name: 'Test Match',
      platform: 'tinder',
      lastUsed: now,
      hidden: false,
      deleted: false,
      createdAt: now,
      updatedAt: now,
      summary: 'Test summary',
    });
    matchId = match.id.toString();

    // Create and link registered user
    const regUser = await db.createUser({
      id: 'test-registered-user',
      name: 'Registered User',
      email: 'test@example.com',
      plan: 'free',
    });
    registeredUserId = regUser.id;
    await db.linkUsers(anonymousUserId, registeredUserId);

    // Verify metadata is preserved
    const savedMatch = await db.getMatchById(registeredUserId, matchId);
    expect(savedMatch).toBeTruthy();
    expect(savedMatch.summary).toBe('Test summary');
    expect(savedMatch.platform).toBe('tinder');
    expect(savedMatch.lastUsed).toBe(now);
  });

  it('should clean up anonymous user data after linking', async () => {
    // Create an anonymous user
    const anonUser = await db.createUser({
      id: 'test-anonymous-user',
      name: 'Anonymous User',
      email: 'anon@example.com',
      plan: 'free',
    });
    anonymousUserId = anonUser.id;

    // Create a match and message for the anonymous user
    const now = new Date().toISOString();
    const match = await db.addMatch(anonymousUserId, {
      name: 'Test Match',
      platform: 'tinder',
      lastUsed: now,
      hidden: false,
      deleted: false,
      createdAt: now,
      updatedAt: now,
    });
    matchId = match.id.toString();
    await db.createMessage(anonymousUserId, matchId, {
      role: MessageRole.USER,
      type: MessageType.TEXT,
      mode: MessageMode.GENERATE,
      used: false,
      content: 'Test message',
      timestamp: new Date().toISOString(),
    });

    // Create a registered user
    const regUser = await db.createUser({
      id: 'test-registered-user',
      name: 'Registered User',
      email: 'test@example.com',
      plan: 'free',
    });
    registeredUserId = regUser.id;

    // Link anonymous user to registered user
    await db.linkUsers(anonymousUserId, registeredUserId);

    // Verify anonymous user is deleted
    const anon = await db.getUser(anonymousUserId);
    expect(anon).toBeNull();

    // Verify anonymous user's match is deleted
    const anonMatch = await db.getMatchById(anonymousUserId, matchId);
    expect(anonMatch).toBeNull();

    // Verify anonymous user's messages are deleted
    const anonMessages = await db.getMessages(anonymousUserId, matchId);
    expect(anonMessages.messages.length).toBe(0);
  });

  it('should merge data when registered user has existing matches/messages', async () => {
    // Create an anonymous user
    const anonUser = await db.createUser({
      id: 'test-anonymous-user',
      name: 'Anonymous User',
      email: 'anon@example.com',
      plan: 'free',
    });
    anonymousUserId = anonUser.id;

    // Create a match and message for the anonymous user
    const now = new Date().toISOString();
    const anonMatch = await db.addMatch(anonymousUserId, {
      name: 'Anonymous Match',
      platform: 'tinder',
      lastUsed: now,
      hidden: false,
      deleted: false,
      createdAt: now,
      updatedAt: now,
    });
    const anonMatchId = anonMatch.id.toString();
    await db.createMessage(anonymousUserId, anonMatchId, {
      role: MessageRole.USER,
      type: MessageType.TEXT,
      mode: MessageMode.GENERATE,
      used: false,
      content: 'Anonymous message',
      timestamp: new Date().toISOString(),
    });

    // Create a registered user with existing match and message
    const regUser = await db.createUser({
      id: 'test-registered-user',
      name: 'Registered User',
      email: 'test@example.com',
      plan: 'free',
    });
    registeredUserId = regUser.id;
    const regMatch = await db.addMatch(registeredUserId, {
      name: 'Registered Match',
      platform: 'tinder',
      lastUsed: now,
      hidden: false,
      deleted: false,
      createdAt: now,
      updatedAt: now,
    });
    const regMatchId = regMatch.id.toString();
    await db.createMessage(registeredUserId, regMatchId, {
      role: MessageRole.USER,
      type: MessageType.TEXT,
      mode: MessageMode.GENERATE,
      used: false,
      content: 'Registered message',
      timestamp: new Date().toISOString(),
    });

    // Link anonymous user to registered user
    await db.linkUsers(anonymousUserId, registeredUserId);

    // Verify that both matches and messages are present in the registered user
    const matches = await db.getMatches(registeredUserId);
    expect(matches.length).toBe(2);
    expect(
      matches.some((match: Match) => match.id.toString() === anonMatchId),
    ).toBeTruthy();
    expect(
      matches.some((match: Match) => match.id.toString() === regMatchId),
    ).toBeTruthy();

    const anonMessages = await db.getMessages(registeredUserId, anonMatchId);
    expect(anonMessages.messages.length).toBe(1);
    expect(anonMessages.messages[0].content).toBe('Anonymous message');

    const regMessages = await db.getMessages(registeredUserId, regMatchId);
    expect(regMessages.messages.length).toBe(1);
    expect(regMessages.messages[0].content).toBe('Registered message');
  });

  it('should handle linking when anonymous user has no matches/messages', async () => {
    // Create an anonymous user without any matches or messages
    const anonUser = await db.createUser({
      id: 'test-anonymous-user',
      name: 'Anonymous User',
      email: 'anon@example.com',
      plan: 'free',
    });
    anonymousUserId = anonUser.id;

    // Create a registered user
    const regUser = await db.createUser({
      id: 'test-registered-user',
      name: 'Registered User',
      email: 'test@example.com',
      plan: 'free',
    });
    registeredUserId = regUser.id;

    // Link anonymous user to registered user
    await db.linkUsers(anonymousUserId, registeredUserId);

    // Verify anonymous user is deleted
    const anon = await db.getUser(anonymousUserId);
    expect(anon).toBeNull();

    // Verify registered user has no matches (since anonymous user had none)
    const matches = await db.getMatches(registeredUserId);
    expect(matches.length).toBe(0);

    // Verify registered user data is preserved
    const reg = await db.getUser(registeredUserId);
    expect(reg).toBeTruthy();
    expect(reg.email).toBe('test@example.com');
    expect(reg.linkedFrom).toBe(anonymousUserId);
  });

  it('should handle linking non-existent users', async () => {
    // Attempt to link non-existent users
    const nonExistentAnonId = 'non-existent-anon';
    const nonExistentRegId = 'non-existent-reg';

    // Verify both users don't exist
    const anon = await db.getUser(nonExistentAnonId);
    const reg = await db.getUser(nonExistentRegId);
    expect(anon).toBeNull();
    expect(reg).toBeNull();

    // Attempt to link should throw an error
    await expect(
      db.linkUsers(nonExistentAnonId, nonExistentRegId),
    ).rejects.toThrow();
  });
});
