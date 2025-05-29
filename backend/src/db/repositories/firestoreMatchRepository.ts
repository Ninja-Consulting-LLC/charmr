import {Firestore} from 'firebase-admin/firestore';
import {firebaseAdmin} from '../../config/firebase-admin';
import logger from '../../utils/logger';
import {ID, Match} from '../types';

export class FirestoreMatchRepository {
  private readonly matchesCollection: string = 'matches';
  private readonly db: Firestore;

  constructor() {
    this.db = firebaseAdmin.firestore();
  }

  async getMatches(userId: string): Promise<Match[]> {
    try {
      const snapshot = await this.db
        .collection(this.matchesCollection)
        .where('hidden', '==', false)
        .where('userId', '==', userId)
        .orderBy('lastUsed', 'desc')
        .get();

      return snapshot.docs.map(doc => {
        const data = doc.data() as Omit<Match, 'id'>;
        return {
          id: doc.id,
          ...data,
        };
      }) as Match[];
    } catch (error) {
      logger.error('Failed to get matches from Firestore', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async getMatchById(matchId: ID): Promise<Match | null> {
    try {
      const docRef = this.db
        .collection(this.matchesCollection)
        .doc(matchId.toString());
      const doc = await docRef.get();

      if (!doc.exists) {
        return null;
      }

      const data = doc.data() as Omit<Match, 'id'>;
      return {
        id: doc.id,
        ...data,
      } as Match;
    } catch (error) {
      logger.error('Failed to get match by ID from Firestore', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async addMatch(match: Omit<Match, 'id'>): Promise<Match> {
    try {
      const docRef = await this.db
        .collection(this.matchesCollection)
        .add(match);
      const doc = await docRef.get();

      const data = doc.data() as Omit<Match, 'id'>;
      return {
        id: doc.id,
        ...data,
      } as Match;
    } catch (error) {
      logger.error('Failed to add match to Firestore', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async updateMatchLastUsed(matchId: ID): Promise<void> {
    try {
      const docRef = this.db
        .collection(this.matchesCollection)
        .doc(matchId.toString());
      await docRef.update({
        lastUsed: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to update match last used in Firestore', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async deleteMatch(matchId: ID): Promise<void> {
    try {
      const docRef = this.db
        .collection(this.matchesCollection)
        .doc(matchId.toString());
      await docRef.delete();
    } catch (error) {
      logger.error('Failed to delete match from Firestore', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async hideMatch(matchId: ID): Promise<void> {
    try {
      const docRef = this.db
        .collection(this.matchesCollection)
        .doc(matchId.toString());
      await docRef.update({
        hidden: true,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to hide match in Firestore', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async restoreMatch(matchId: ID): Promise<void> {
    try {
      const docRef = this.db
        .collection(this.matchesCollection)
        .doc(matchId.toString());
      await docRef.update({
        hidden: false,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to restore match in Firestore', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async clearDatabase(): Promise<void> {
    try {
      const snapshot = await this.db.collection(this.matchesCollection).get();
      const batch = this.db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      logger.info('Matches collection cleared successfully');
    } catch (error) {
      logger.error('Failed to clear matches collection', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }
}
