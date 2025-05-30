import {Firestore} from 'firebase-admin/firestore';
import {firebaseAdmin} from '../../config/firebase-admin';
import logger from '../../utils/logger';
import {ID, MessageCost} from '../types';

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
