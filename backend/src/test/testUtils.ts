import {firebaseAdmin} from '../config/firebase-admin';
import logger from '../utils/logger';

export class TestUtils {
  private static db = firebaseAdmin.firestore();

  /**
   * Cleans up test data for a specific user and their related collections
   * @param userId The ID of the user whose test data should be cleaned up
   */
  static async cleanupUserTestData(userId: string): Promise<void> {
    try {
      const batch = this.db.batch();

      // Get user's matches
      const matchesSnapshot = await this.db
        .collection('users')
        .doc(userId)
        .collection('matches')
        .get();

      // Delete all messages in each match
      for (const matchDoc of matchesSnapshot.docs) {
        const messagesSnapshot = await matchDoc.ref
          .collection('messages')
          .get();
        messagesSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });

        // Delete the match document
        batch.delete(matchDoc.ref);
      }

      // Delete the user document
      batch.delete(this.db.collection('users').doc(userId));

      await batch.commit();
      logger.info('Test data cleaned up successfully', {userId});
    } catch (error) {
      logger.error('Failed to clean up test data', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        userId,
      });
      throw error;
    }
  }

  /**
   * Cleans up test data for multiple users
   * @param userIds Array of user IDs whose test data should be cleaned up
   */
  static async cleanupMultipleUsersTestData(userIds: string[]): Promise<void> {
    try {
      await Promise.all(
        userIds.map(userId => this.cleanupUserTestData(userId)),
      );
      logger.info('Test data cleaned up successfully for multiple users', {
        userIds,
      });
    } catch (error) {
      logger.error('Failed to clean up test data for multiple users', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        userIds,
      });
      throw error;
    }
  }

  /**
   * Cleans up test data for a specific match and its messages
   * @param userId The ID of the user who owns the match
   * @param matchId The ID of the match to clean up
   */
  static async cleanupMatchTestData(
    userId: string,
    matchId: string,
  ): Promise<void> {
    try {
      const batch = this.db.batch();
      const matchRef = this.db
        .collection('users')
        .doc(userId)
        .collection('matches')
        .doc(matchId);

      // Delete all messages in the match
      const messagesSnapshot = await matchRef.collection('messages').get();
      messagesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Delete the match document
      batch.delete(matchRef);

      await batch.commit();
      logger.info('Match test data cleaned up successfully', {userId, matchId});
    } catch (error) {
      logger.error('Failed to clean up match test data', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        userId,
        matchId,
      });
      throw error;
    }
  }
}
