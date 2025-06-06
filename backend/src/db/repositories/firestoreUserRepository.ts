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
    deviceToken?: string;
  }): Promise<User> {
    try {
      const userData = {
        email: user.email,
        name: user.name,
        plan: user.plan || SubscriptionTier.FREE,
        dailyMessagesUsed: 0,
        extraMessages: 0,
        lastResetDate: new Date().toISOString(),
        notificationDates: {
          coach: null,
        },
        deviceToken: user.deviceToken || null,
        installationId: user.installationId || null,
        createdAt: new Date().toISOString(),
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
      const today = new Date().toISOString();
      const todayDate = new Date(today);
      const snapshot = await this.db
        .collection(this.usersCollection)
        .where('lastResetDate', '<', todayDate.toDateString())
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

  async linkUsers(
    anonymousUserId: string,
    registeredUserId: string,
  ): Promise<void> {
    try {
      logger.info('Starting user linking process in Firestore', {
        anonymousUserId,
        registeredUserId,
      });

      const batch = this.db.batch();

      // Get the anonymous user's data
      logger.info('Fetching anonymous user data...', {anonymousUserId});
      const anonymousUserDoc = await this.db
        .collection(this.usersCollection)
        .doc(anonymousUserId)
        .get();

      if (!anonymousUserDoc.exists) {
        logger.error('Anonymous user not found in Firestore', {
          anonymousUserId,
        });
        throw new Error('Anonymous user not found');
      }

      const anonymousUserData = anonymousUserDoc.data();
      logger.info('Retrieved anonymous user data', {
        anonymousUserId,
        anonymousUserData: {
          id: anonymousUserData?.id,
          email: anonymousUserData?.email,
          installationId: anonymousUserData?.installationId,
          dailyMessagesUsed: anonymousUserData?.dailyMessagesUsed,
          extraMessages: anonymousUserData?.extraMessages,
          plan: anonymousUserData?.plan,
          lastResetDate: anonymousUserData?.lastResetDate,
        },
      });

      // Get all matches from anonymous user
      logger.info('Fetching matches from anonymous user...', {anonymousUserId});
      const matchesSnapshot = await anonymousUserDoc.ref
        .collection('matches')
        .get();
      logger.info('Found matches from anonymous user', {
        anonymousUserId,
        matchCount: matchesSnapshot.size,
        matchIds: matchesSnapshot.docs.map(doc => doc.id),
      });

      // Transfer each match and its messages to the registered user
      for (const matchDoc of matchesSnapshot.docs) {
        const matchData = matchDoc.data();
        logger.info('Processing match for transfer', {
          anonymousUserId,
          registeredUserId,
          matchId: matchDoc.id,
          matchName: matchData.name,
          matchData: {
            ...matchData,
            createdAt: matchData.createdAt?.toDate?.() || matchData.createdAt,
            updatedAt: matchData.updatedAt?.toDate?.() || matchData.updatedAt,
          },
        });

        // Create the match in registered user's collection
        const newMatchRef = this.db
          .collection(this.usersCollection)
          .doc(registeredUserId)
          .collection('matches')
          .doc(matchDoc.id);

        const matchUpdateData = {
          ...matchData,
          updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
        };
        logger.info('Setting match data in registered user collection', {
          registeredUserId,
          matchId: matchDoc.id,
          matchUpdateData,
        });
        batch.set(newMatchRef, matchUpdateData);

        // Get all messages for this match
        const messagesSnapshot = await matchDoc.ref
          .collection('messages')
          .get();
        logger.info('Found messages for match', {
          anonymousUserId,
          registeredUserId,
          matchId: matchDoc.id,
          messageCount: messagesSnapshot.size,
          messageIds: messagesSnapshot.docs.map(doc => doc.id),
        });

        // Transfer messages to the new match
        for (const messageDoc of messagesSnapshot.docs) {
          const messageData = messageDoc.data();
          const newMessageRef = newMatchRef
            .collection('messages')
            .doc(messageDoc.id);
          logger.info('Setting message data in registered user collection', {
            registeredUserId,
            matchId: matchDoc.id,
            messageId: messageDoc.id,
            messageData: {
              ...messageData,
              createdAt:
                messageData.createdAt?.toDate?.() || messageData.createdAt,
              updatedAt:
                messageData.updatedAt?.toDate?.() || messageData.updatedAt,
            },
          });
          batch.set(newMessageRef, messageData);
        }
      }

      // Create or update the registered user with the anonymous user's data
      const registeredUserRef = this.db
        .collection(this.usersCollection)
        .doc(registeredUserId);

      // Check if registered user already exists
      const registeredUserDoc = await registeredUserRef.get();
      const registeredUserData = registeredUserDoc.exists
        ? registeredUserDoc.data()
        : null;
      logger.info('Checking registered user existence', {
        registeredUserId,
        exists: registeredUserDoc.exists,
        registeredUserData: registeredUserData
          ? {
              id: registeredUserData.id,
              email: registeredUserData.email,
              installationId: registeredUserData.installationId,
              dailyMessagesUsed: registeredUserData.dailyMessagesUsed,
              extraMessages: registeredUserData.extraMessages,
              plan: registeredUserData.plan,
              lastResetDate: registeredUserData.lastResetDate,
            }
          : null,
      });

      // Calculate message counts
      const anonymousDailyMessages = anonymousUserData?.dailyMessagesUsed || 0;
      const anonymousExtraMessages = anonymousUserData?.extraMessages || 0;
      const registeredDailyMessages =
        registeredUserData?.dailyMessagesUsed || 0;
      const registeredExtraMessages = registeredUserData?.extraMessages || 0;
      const totalDailyMessages = Math.max(
        anonymousDailyMessages,
        registeredDailyMessages,
      ); // Take the higher count
      const totalExtraMessages =
        anonymousExtraMessages + registeredExtraMessages;

      logger.info('Calculating message counts for transfer', {
        anonymousUserId,
        registeredUserId,
        anonymousDailyMessages,
        anonymousExtraMessages,
        registeredDailyMessages,
        registeredExtraMessages,
        totalDailyMessages,
        totalExtraMessages,
      });

      // Merge the anonymous user's data with the registered user's data
      const updateData = {
        id: registeredUserId,
        linkedFrom: anonymousUserId,
        linkedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
        ...anonymousUserData,
        email: registeredUserData?.email || anonymousUserData?.email,
        name: registeredUserData?.name || anonymousUserData?.name,
        plan: registeredUserData?.plan || anonymousUserData?.plan,
        // Set message counts last to ensure they're not overwritten
        dailyMessagesUsed: totalDailyMessages,
        extraMessages: totalExtraMessages,
        notificationDates: {
          coach:
            registeredUserData?.notificationDates?.coach ||
            anonymousUserData?.notificationDates?.coach ||
            null,
        },
        installationId:
          anonymousUserData?.installationId ||
          registeredUserData?.installationId,
      } as User & {
        linkedFrom: string;
        linkedAt: FirebaseFirestore.FieldValue;
      };

      logger.info(
        'Preparing to update registered user with anonymous user data',
        {
          registeredUserId,
          updateData: {
            id: updateData.id,
            email: updateData.email,
            installationId: updateData.installationId,
            linkedFrom: updateData.linkedFrom,
            dailyMessagesUsed: updateData.dailyMessagesUsed,
            extraMessages: updateData.extraMessages,
            plan: updateData.plan,
            lastResetDate: updateData.lastResetDate,
          },
        },
      );

      // Add the update operation to the batch
      logger.info('Adding update operation to batch', {
        operation: 'set',
        path: `users/${registeredUserId}`,
        merge: true,
      });
      batch.set(registeredUserRef, updateData, {merge: true});

      // Commit the transaction
      logger.info('Committing batch operation...');
      try {
        await batch.commit();
        logger.info('Batch operation committed successfully');
      } catch (error) {
        logger.error('Failed to commit batch operation', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }

      // Delete anonymous user after successful linking
      try {
        await this.db
          .collection(this.usersCollection)
          .doc(anonymousUserId)
          .delete();
        logger.info('Anonymous user deleted after linking', {anonymousUserId});
      } catch (error) {
        logger.error('Failed to delete anonymous user after linking', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          anonymousUserId,
        });
        // Not throwing error here to avoid rollback of successful linking
      }

      // Verify the final state
      const finalRegisteredUserDoc = await registeredUserRef.get();
      const finalRegisteredUserData = finalRegisteredUserDoc.data();
      logger.info('Final state of registered user after linking', {
        registeredUserId,
        finalUserData: {
          id: finalRegisteredUserData?.id,
          email: finalRegisteredUserData?.email,
          installationId: finalRegisteredUserData?.installationId,
          dailyMessagesUsed: finalRegisteredUserData?.dailyMessagesUsed,
          extraMessages: finalRegisteredUserData?.extraMessages,
          plan: finalRegisteredUserData?.plan,
          lastResetDate: finalRegisteredUserData?.lastResetDate,
          linkedFrom: finalRegisteredUserData?.linkedFrom,
        },
      });

      logger.info('Successfully linked users in Firestore', {
        anonymousUserId,
        registeredUserId,
        operation: 'link_users',
        status: 'success',
        transferredMatches: matchesSnapshot.size,
        transferredMessageCounts: {
          dailyMessagesUsed: totalDailyMessages,
          extraMessages: totalExtraMessages,
        },
      });
    } catch (error) {
      logger.error('Failed to link users in Firestore', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        anonymousUserId,
        registeredUserId,
        operation: 'link_users',
        status: 'error',
        errorDetails: error,
      });
      throw error;
    }
  }

  async getUsersWithDeviceToken(): Promise<User[]> {
    try {
      const snapshot = await this.db
        .collection(this.usersCollection)
        .where('deviceToken', '!=', null)
        .get();

      return snapshot.docs.map(
        doc =>
          ({
            id: doc.id,
            ...doc.data(),
          } as User),
      );
    } catch (error) {
      logger.error('Failed to get users with device token from Firestore', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }
}
