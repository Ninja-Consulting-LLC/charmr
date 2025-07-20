import {createSqliteDatabase} from '../db/sqlite';
import {Database} from '../db/types';
import {MessageMode, MessageRole, MessageType} from '../types/enums';

describe('Cost Tracking System', () => {
  let db: Database;

  beforeAll(async () => {
    db = await createSqliteDatabase();
  });

  beforeEach(async () => {
    // Clean up test users instead of clearing entire database
    const testUserIds = [
      'test-user-1',
      'test-user-2',
      'test-user-3',
      'test-user-4',
      'test-user-5',
    ];
    for (const userId of testUserIds) {
      try {
        await db.deleteUser(userId);
      } catch (error) {
        // User might not exist, ignore
      }
    }
  });

  describe('User Cost Tracking', () => {
    it('should initialize user with zero costs', async () => {
      const user = await db.createUser({
        id: 'test-user-1',
        email: 'test@example.com',
        name: 'Test User',
      });

      expect(user?.totalCost).toBe(0);
      expect(user?.totalTokens).toBe(0);
      expect(user?.lastCostUpdate).toBeDefined();
    });

    it('should update user costs correctly', async () => {
      await db.createUser({
        id: 'test-user-2',
        email: 'test2@example.com',
        name: 'Test User 2',
      });

      // Update costs
      await db.updateUserCosts('test-user-2', {
        totalCost: 0.05,
        totalTokens: 150,
      });

      const userCosts = await db.getUserCosts('test-user-2');
      expect(userCosts.totalCost).toBe(0.05);
      expect(userCosts.totalTokens).toBe(150);
      expect(userCosts.lastCostUpdate).toBeDefined();

      // Update costs again
      await db.updateUserCosts('test-user-2', {
        totalCost: 0.03,
        totalTokens: 100,
      });

      const updatedCosts = await db.getUserCosts('test-user-2');
      expect(updatedCosts.totalCost).toBe(0.08); // 0.05 + 0.03
      expect(updatedCosts.totalTokens).toBe(250); // 150 + 100
    });
  });

  describe('Message Cost Tracking', () => {
    it('should save message with embedded cost data', async () => {
      await db.createUser({
        id: 'test-user-3',
        email: 'test3@example.com',
        name: 'Test User 3',
      });

      const message = await db.createMessage('test-user-3', 'test-match', {
        role: MessageRole.ASSISTANT,
        type: MessageType.TEXT,
        mode: MessageMode.GENERATE,
        content: 'Test reply',
        timestamp: new Date().toISOString(),
        model: 'gpt-4',
        promptTokens: 50,
        completionTokens: 25,
        totalTokens: 75,
        inputCost: 0.001,
        outputCost: 0.002,
        totalCost: 0.003,
        costTimestamp: new Date().toISOString(),
      });

      expect(message.model).toBe('gpt-4');
      expect(message.promptTokens).toBe(50);
      expect(message.completionTokens).toBe(25);
      expect(message.totalTokens).toBe(75);
      expect(message.inputCost).toBe(0.001);
      expect(message.outputCost).toBe(0.002);
      expect(message.totalCost).toBe(0.003);
      expect(message.costTimestamp).toBeDefined();
    });

    it('should retrieve messages with cost data', async () => {
      await db.createUser({
        id: 'test-user-4',
        email: 'test4@example.com',
        name: 'Test User 4',
      });

      // Create a message with cost data
      await db.createMessage('test-user-4', 'test-match', {
        role: MessageRole.ASSISTANT,
        type: MessageType.TEXT,
        mode: MessageMode.GENERATE,
        content: 'Test reply',
        timestamp: new Date().toISOString(),
        model: 'gpt-4',
        promptTokens: 50,
        completionTokens: 25,
        totalTokens: 75,
        inputCost: 0.001,
        outputCost: 0.002,
        totalCost: 0.003,
        costTimestamp: new Date().toISOString(),
      });

      const {messages} = await db.getMessages('test-user-4', 'test-match');
      expect(messages).toHaveLength(1);
      expect(messages[0].model).toBe('gpt-4');
      expect(messages[0].totalCost).toBe(0.003);
    });
  });

  describe('Integration: Reply Generation with Cost Tracking', () => {
    it('should track costs when generating replies', async () => {
      await db.createUser({
        id: 'test-user-5',
        email: 'test5@example.com',
        name: 'Test User 5',
      });

      // Simulate the cost tracking that happens in reply generation
      const costData = {
        model: 'gpt-4',
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
        inputCost: 0.003,
        outputCost: 0.001,
        totalCost: 0.004,
        costTimestamp: new Date().toISOString(),
      };

      // Save message with cost data
      const message = await db.createMessage('test-user-5', 'test-match', {
        role: MessageRole.ASSISTANT,
        type: MessageType.TEXT,
        mode: MessageMode.GENERATE,
        content: 'Generated reply',
        timestamp: new Date().toISOString(),
        ...costData,
      });

      // Update user costs
      await db.updateUserCosts('test-user-5', {
        totalCost: costData.totalCost,
        totalTokens: costData.totalTokens,
      });

      // Verify message has cost data
      expect(message.totalCost).toBe(0.004);
      expect(message.totalTokens).toBe(150);

      // Verify user costs are updated
      const userCosts = await db.getUserCosts('test-user-5');
      expect(userCosts.totalCost).toBe(0.004);
      expect(userCosts.totalTokens).toBe(150);
    });
  });
});
