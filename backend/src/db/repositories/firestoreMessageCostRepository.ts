import {Firestore} from 'firebase-admin/firestore';
import {firebaseAdmin} from '../../config/firebase-admin';
import logger from '../../utils/logger';
import {ID, MessageCost} from '../types';
import {FirestoreMatchRepository} from './firestoreMatchRepository';
import {FirestoreMessageRepository} from './firestoreMessageRepository';

export class FirestoreMessageCostRepository {
  private readonly messageCostsCollection: string = 'messageCosts';
  private readonly db: Firestore;

  constructor() {
    this.db = firebaseAdmin.firestore();
  }

  async saveMessageCost(
    messageId: ID,
    cost: Omit<MessageCost, 'id' | 'messageId'>,
  ): Promise<MessageCost> {
    try {
      const docRef = await this.db.collection(this.messageCostsCollection).add({
        ...cost,
        messageId,
      });
      const doc = await docRef.get();
      const data = doc.data() as Omit<MessageCost, 'id'>;

      return {
        id: doc.id,
        ...data,
      } as MessageCost;
    } catch (error) {
      logger.error('Failed to save message cost to Firestore', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async getMessageCosts(messageId: ID): Promise<MessageCost[]> {
    try {
      const snapshot = await this.db
        .collection(this.messageCostsCollection)
        .where('messageId', '==', messageId)
        .orderBy('timestamp', 'desc')
        .get();

      return snapshot.docs.map(doc => {
        const data = doc.data() as Omit<MessageCost, 'id'>;
        return {
          id: doc.id,
          ...data,
        } as MessageCost;
      });
    } catch (error) {
      logger.error('Failed to get message costs from Firestore', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Costs are stored on message documents in Firestore (not only in `messageCosts`).
   * Aggregates embedded cost fields across all of the user's matches.
   */
  async listEmbeddedCostsForUser(
    userId: string,
    matchRepository: FirestoreMatchRepository,
    messageRepository: FirestoreMessageRepository,
    startDate?: string,
    endDate?: string,
  ): Promise<MessageCost[]> {
    const matches = await matchRepository.getMatches(userId, true);
    const out: MessageCost[] = [];
    const start = startDate ? new Date(startDate).getTime() : null;
    const end = endDate ? new Date(endDate).getTime() : null;

    for (const match of matches) {
      const {messages} = await messageRepository.getMessagesByMatch(
        userId,
        String(match.id),
      );
      for (const msg of messages) {
        const totalCost = Number(msg.totalCost);
        if (!Number.isFinite(totalCost) || totalCost <= 0) {
          continue;
        }
        const tsRaw = msg.costTimestamp || msg.timestamp;
        const tsMs = new Date(tsRaw).getTime();
        if (start !== null && tsMs < start) {
          continue;
        }
        if (end !== null && tsMs > end) {
          continue;
        }
        out.push({
          id: `emb-${msg.id}`,
          messageId: msg.id,
          model: msg.model || '',
          promptTokens: msg.promptTokens ?? 0,
          completionTokens: msg.completionTokens ?? 0,
          totalTokens: msg.totalTokens ?? 0,
          inputCost: msg.inputCost ?? 0,
          outputCost: msg.outputCost ?? 0,
          totalCost,
          timestamp: tsRaw,
        } as MessageCost);
      }
    }

    out.sort((a, b) =>
      String(b.timestamp).localeCompare(String(a.timestamp)),
    );
    return out;
  }

  async aggregateEmbeddedTotalsForUser(
    userId: string,
    matchRepository: FirestoreMatchRepository,
    messageRepository: FirestoreMessageRepository,
    startDate?: string,
    endDate?: string,
  ): Promise<{
    totalCost: number;
    totalTokens: number;
    messageCount: number;
  }> {
    const costs = await this.listEmbeddedCostsForUser(
      userId,
      matchRepository,
      messageRepository,
      startDate,
      endDate,
    );
    let totalCost = 0;
    let totalTokens = 0;
    for (const c of costs) {
      totalCost += c.totalCost || 0;
      totalTokens += c.totalTokens || 0;
    }
    return {
      totalCost,
      totalTokens,
      messageCount: costs.length,
    };
  }

  async getTotalCosts(): Promise<{
    totalCost: number;
    totalTokens: number;
    messageCount: number;
  }> {
    try {
      const snapshot = await this.db
        .collection(this.messageCostsCollection)
        .get();

      let totalCost = 0;
      let totalTokens = 0;
      const messageIds = new Set<string>();

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        totalCost += data.totalCost || 0;
        totalTokens += data.totalTokens || 0;
        messageIds.add(data.messageId.toString());
      });

      return {
        totalCost,
        totalTokens,
        messageCount: messageIds.size,
      };
    } catch (error) {
      logger.error('Failed to get total costs from Firestore', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async clearDatabase(): Promise<void> {
    try {
      const snapshot = await this.db
        .collection(this.messageCostsCollection)
        .get();
      const batch = this.db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      logger.info('Message costs collection cleared successfully');
    } catch (error) {
      logger.error('Failed to clear message costs collection', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }
}
