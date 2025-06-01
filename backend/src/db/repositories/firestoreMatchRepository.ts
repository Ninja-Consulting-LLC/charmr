import {Firestore} from 'firebase-admin/firestore';
import {firebaseAdmin} from '../../config/firebase-admin';
import logger from '../../utils/logger';
import {ID, Match} from '../types';

export class FirestoreMatchRepository {
  private readonly db: Firestore;

  constructor() {
    this.db = firebaseAdmin.firestore();
  }

  private getMatchesCollection(userId: string) {
    return this.db.collection('users').doc(userId).collection('matches');
  }

  async getMatches(
    userId: string,
    includeHidden: boolean = false,
  ): Promise<Match[]> {
    try {
      let query = this.getMatchesCollection(userId).where(
        'deleted',
        '==',
        false,
      );

      if (!includeHidden) {
        query = query.where('hidden', '==', false);
      }

      const snapshot = await query.get();
      const matches = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Match[];

      const hiddenMatchesCount = matches.filter(match => match.hidden).length;
      logger.debug('Firestore query result:', {
        matchesCount: matches.length,
        hiddenMatchesCount,
        includeHidden,
      });

      return matches;
    } catch (error) {
      logger.error('Failed to get matches from Firestore', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async getMatchById(userId: string, matchId: ID): Promise<Match | null> {
    try {
      const docRef = this.getMatchesCollection(userId).doc(matchId.toString());
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

  async addMatch(userId: string, match: Omit<Match, 'id'>): Promise<Match> {
    try {
      const docRef = this.getMatchesCollection(userId).doc();
      const matchData = {
        ...match,
        deleted: false,
      };
      await docRef.set(matchData);
      return {
        id: docRef.id,
        ...matchData,
      } as Match;
    } catch (error) {
      logger.error('Failed to add match to Firestore', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async updateMatchLastUsed(userId: string, matchId: ID): Promise<void> {
    try {
      const docRef = this.getMatchesCollection(userId).doc(matchId.toString());
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

  async deleteMatch(userId: string, matchId: ID): Promise<void> {
    try {
      const docRef = this.getMatchesCollection(userId).doc(matchId.toString());
      await docRef.update({
        deleted: true,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to delete match from Firestore', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async hideMatch(userId: string, matchId: ID): Promise<void> {
    try {
      logger.info('Attempting to hide match in Firestore', {userId, matchId});
      const docRef = this.getMatchesCollection(userId).doc(matchId.toString());

      // Check if document exists before updating
      const doc = await docRef.get();
      if (!doc.exists) {
        logger.error('Match not found in Firestore', {userId, matchId});
        throw new Error('Match not found');
      }

      logger.info('Found match in Firestore, updating hidden flag', {
        userId,
        matchId,
        currentData: doc.data(),
      });

      await docRef.update({
        hidden: true,
        updatedAt: new Date().toISOString(),
      });

      logger.info('Successfully updated match in Firestore', {userId, matchId});
    } catch (error) {
      logger.error('Failed to hide match in Firestore', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        userId,
        matchId,
      });
      throw error;
    }
  }

  async restoreMatch(userId: string, matchId: ID): Promise<void> {
    try {
      logger.info('Attempting to restore match in Firestore', {
        userId,
        matchId,
      });
      const docRef = this.getMatchesCollection(userId).doc(matchId.toString());

      // Check if document exists before updating
      const doc = await docRef.get();
      if (!doc.exists) {
        logger.error('Match not found in Firestore', {userId, matchId});
        throw new Error('Match not found');
      }

      logger.info('Found match in Firestore, updating hidden flag', {
        userId,
        matchId,
        currentData: doc.data(),
      });

      await docRef.update({
        hidden: false,
        updatedAt: new Date().toISOString(),
      });

      logger.info('Successfully restored match in Firestore', {
        userId,
        matchId,
      });
    } catch (error) {
      logger.error('Failed to restore match in Firestore', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        userId,
        matchId,
      });
      throw error;
    }
  }

  async clearDatabase(): Promise<void> {
    try {
      const usersSnapshot = await this.db.collection('users').get();
      for (const userDoc of usersSnapshot.docs) {
        const matchesSnapshot = await userDoc.ref.collection('matches').get();
        const batch = this.db.batch();
        matchesSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
      }
      logger.info('Matches subcollections cleared successfully');
    } catch (error) {
      logger.error('Failed to clear matches subcollections', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }
}
