import {afterEach, beforeEach, describe, expect, it} from '@jest/globals';
import {getDatabase} from '../db';
import {getMessageRepository} from '../db/repositories';
import {Message} from '../db/types';
import {MessageMode, MessageRole, MessageType} from '../types/enums';

describe('Message Repository', () => {
  let db: any;
  let messageRepository: any;
  const testUserId = 'test-user-123';
  let testMatchId: string;

  beforeEach(async () => {
    db = await getDatabase();
    messageRepository = getMessageRepository(db);

    await db.run('DELETE FROM messages WHERE userId = ?', testUserId);
    await db.run('DELETE FROM screenshots WHERE userId = ?', testUserId);
    await db.run('DELETE FROM matches WHERE userId = ?', testUserId);
    await db.run('DELETE FROM users WHERE id = ?', testUserId);

    await db.createUser({
      id: testUserId,
      email: 'test@example.com',
      name: 'Test User',
    });
    const now = new Date().toISOString();
    const match = await db.addMatch(testUserId, {
      userId: testUserId,
      name: 'Seed Match',
      platform: 'test',
      lastUsed: now,
      hidden: false,
      deleted: false,
      createdAt: now,
      updatedAt: now,
    });
    testMatchId = String(match.id);
  });

  afterEach(async () => {
    await db.run('DELETE FROM messages WHERE userId = ?', testUserId);
    await db.run('DELETE FROM screenshots WHERE userId = ?', testUserId);
    await db.run('DELETE FROM matches WHERE userId = ?', testUserId);
    await db.run('DELETE FROM users WHERE id = ?', testUserId);
  });

  describe('seedTestData', () => {
    it('should create all required message types with default content', async () => {
      const result = await messageRepository.seedTestData(
        testUserId,
        testMatchId,
      );

      // Verify all expected messages were created
      expect(result.userMessage).toBeDefined();
      expect(result.assistantMessage).toBeDefined();
      expect(result.alternateMessage).toBeDefined();
      expect(result.screenshot).toBeDefined();
      expect(result.summaryMessage).toBeDefined();
      expect(result.coachMessage).toBeDefined();

      // Verify message properties
      expect(result.userMessage.role).toBe(MessageRole.USER);
      expect(result.userMessage.type).toBe(MessageType.TEXT);
      expect(result.userMessage.content).toBe('What should I say next?');

      expect(result.assistantMessage.role).toBe(MessageRole.ASSISTANT);
      expect(result.assistantMessage.mode).toBe(MessageMode.GENERATE);
      expect(result.assistantMessage.used).toBe(true);

      expect(result.alternateMessage.role).toBe(MessageRole.ASSISTANT);
      expect(result.alternateMessage.mode).toBe(MessageMode.GENERATE);
      expect(result.alternateMessage.used).toBe(false);
      expect(result.alternateMessage.replyTo).toBe(result.assistantMessage.id);

      expect(result.summaryMessage.role).toBe(MessageRole.SYSTEM);
      expect(result.summaryMessage.type).toBe(MessageType.SUMMARY);
      expect(result.summaryMessage.replyTo).toBe(result.screenshot.id);

      expect(result.coachMessage.role).toBe(MessageRole.ASSISTANT);
      expect(result.coachMessage.mode).toBe(MessageMode.COACH);
    });

    it('should create messages with custom content when provided', async () => {
      const customContent = {
        userMessage: 'Custom user question',
        assistantMessage: 'Custom assistant reply',
        alternateMessage: 'Custom alternate reply',
        summaryContent: 'Custom summary content',
        coachAdvice: 'Custom coaching advice',
      };

      const result = await messageRepository.seedTestData(
        testUserId,
        testMatchId,
        customContent,
      );

      expect(result.userMessage.content).toBe(customContent.userMessage);
      expect(result.assistantMessage.content).toBe(
        customContent.assistantMessage,
      );
      expect(result.alternateMessage.content).toBe(
        customContent.alternateMessage,
      );
      expect(result.summaryMessage.content).toBe(customContent.summaryContent);
      expect(result.coachMessage.content).toBe(customContent.coachAdvice);
    });

    it('should maintain proper message ordering by timestamp', async () => {
      const result = await messageRepository.seedTestData(
        testUserId,
        testMatchId,
      );
      const {messages} = await messageRepository.getMessagesByMatch(
        testUserId,
        testMatchId,
      );

      // Verify messages are ordered by timestamp
      const timestamps = messages.map((m: Message) =>
        new Date(m.timestamp).getTime(),
      );
      const isOrdered = timestamps.every(
        (t: number, i: number) => i === 0 || t >= timestamps[i - 1],
      );
      expect(isOrdered).toBe(true);
    });

    it('should create valid message relationships', async () => {
      const result = await messageRepository.seedTestData(
        testUserId,
        testMatchId,
      );
      const {messages} = await messageRepository.getMessagesByMatch(
        testUserId,
        testMatchId,
      );

      // Verify alternate message references the assistant message
      const alternateMessage = messages.find(
        (m: Message) => m.id === result.alternateMessage.id,
      );
      expect(alternateMessage?.replyTo).toBe(result.assistantMessage.id);

      // Verify summary message references the screenshot
      const summaryMessage = messages.find(
        (m: Message) => m.id === result.summaryMessage.id,
      );
      expect(summaryMessage?.replyTo).toBe(result.screenshot.id);
    });
  });
});
