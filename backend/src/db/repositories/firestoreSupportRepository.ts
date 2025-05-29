import {Firestore} from 'firebase-admin/firestore';
import {firebaseAdmin} from '../../config/firebase-admin';
import logger from '../../utils/logger';
import {SupportTicket} from '../types';

export class FirestoreSupportRepository {
  private readonly ticketsCollection: string = 'supportTickets';
  private readonly db: Firestore;

  constructor() {
    this.db = firebaseAdmin.firestore();
  }

  async createTicket(
    ticket: Omit<SupportTicket, 'id'>,
  ): Promise<SupportTicket> {
    try {
      const docRef = await this.db
        .collection(this.ticketsCollection)
        .add(ticket);
      const doc = await docRef.get();

      return {
        id: doc.id,
        ...doc.data(),
      } as SupportTicket;
    } catch (error) {
      logger.error('Failed to create support ticket in Firestore', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async getTicketsByUserId(userId: string): Promise<SupportTicket[]> {
    try {
      const snapshot = await this.db
        .collection(this.ticketsCollection)
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as SupportTicket[];
    } catch (error) {
      logger.error('Failed to get support tickets from Firestore', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async updateTicketStatus(
    ticketId: string,
    status: SupportTicket['status'],
  ): Promise<void> {
    try {
      const docRef = this.db.collection(this.ticketsCollection).doc(ticketId);
      await docRef.update({
        status,
        updatedAt: new Date(),
      });
    } catch (error) {
      logger.error('Failed to update support ticket status in Firestore', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async clearDatabase(): Promise<void> {
    try {
      const snapshot = await this.db.collection(this.ticketsCollection).get();
      const batch = this.db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      logger.info('Support tickets collection cleared successfully');
    } catch (error) {
      logger.error('Failed to clear support tickets collection', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }
}
