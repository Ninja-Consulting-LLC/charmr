import {Firestore} from 'firebase-admin/firestore';
import {firebaseAdmin} from '../../config/firebase-admin';
import {SubscriptionTier} from '../../types/enums';
import logger from '../../utils/logger';
import {User} from '../types';

export class FirestoreUserRepository {
  private readonly usersCollection: string = 'users';
  private readonly db: Firestore;

  constructor() {
    this.db = firebaseAdmin.firestore();
  }

  async getUser(userId: string): Promise<User | null> {
    try {
      const docRef = this.db.collection(this.usersCollection).doc(userId);
      const doc = await docRef.get();

      if (!doc.exists) {
        return null;
      }

      return {
        id: doc.id,
        ...doc.data(),
      } as User;
    } catch (error) {
      logger.error('Failed to get user from Firestore', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async getUserByInstallationId(installationId: string): Promise<User | null> {
    try {
      const snapshot = await this.db
        .collection(this.usersCollection)
        .where('installationId', '==', installationId)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
      } as User;
    } catch (error) {
      logger.error('Failed to get user by installation ID from Firestore', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async createUser(user: {
    id: string;
    email: string;
    name: string;
    plan?: SubscriptionTier;
    installationId?: string;
  }): Promise<User> {
    try {
      const userData = {
        email: user.email,
        name: user.name,
        plan: user.plan || SubscriptionTier.FREE,
        dailyMessagesUsed: 0,
        extraMessages: 0,
        lastResetDate: new Date().toISOString().split('T')[0],
        installationId: user.installationId || null,
      };

      const docRef = this.db.collection(this.usersCollection).doc(user.id);
      await docRef.set(userData);

      const doc = await docRef.get();
      return {
        id: doc.id,
        ...doc.data(),
      } as User;
    } catch (error) {
      logger.error('Failed to create user in Firestore', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<void> {
    try {
      const docRef = this.db.collection(this.usersCollection).doc(userId);
      await docRef.update(updates);
    } catch (error) {
      logger.error('Failed to update user in Firestore', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async incrementMessageCount(userId: string): Promise<boolean> {
    try {
      const docRef = this.db.collection(this.usersCollection).doc(userId);
      await docRef.update({
        dailyMessagesUsed: firebaseAdmin.firestore.FieldValue.increment(1),
      });
      return true;
    } catch (error) {
      logger.error('Failed to increment message count in Firestore', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      return false;
    }
  }

  async resetDailyMessageCounts(): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const snapshot = await this.db
        .collection(this.usersCollection)
        .where('lastResetDate', '!=', today)
        .get();

      const batch = this.db.batch();
      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          dailyMessagesUsed: 0,
          lastResetDate: today,
        });
      });

      await batch.commit();
    } catch (error) {
      logger.error('Failed to reset daily message counts in Firestore', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async addExtraMessages(userId: string, count: number): Promise<void> {
    try {
      const docRef = this.db.collection(this.usersCollection).doc(userId);
      await docRef.update({
        extraMessages: firebaseAdmin.firestore.FieldValue.increment(count),
      });
    } catch (error) {
      logger.error('Failed to add extra messages in Firestore', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async updateUserPlan(userId: string, plan: SubscriptionTier): Promise<void> {
    try {
      const docRef = this.db.collection(this.usersCollection).doc(userId);
      await docRef.update({plan});
    } catch (error) {
      logger.error('Failed to update user plan in Firestore', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async clearDatabase(): Promise<void> {
    try {
      const snapshot = await this.db.collection(this.usersCollection).get();
      const batch = this.db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      logger.info('Users collection cleared successfully');
    } catch (error) {
      logger.error('Failed to clear users collection', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }
}
