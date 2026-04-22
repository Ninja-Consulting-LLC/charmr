import {databaseConfig} from '../config/database';
import {firebaseAdmin} from '../config/firebase-admin';
import {Database} from './types';

/**
 * Lightweight connectivity check for the active persistence backend.
 */
export async function pingDatabase(db: Database): Promise<void> {
  if (databaseConfig.type === 'sqlite') {
    await db.get('SELECT 1');
    return;
  }

  await firebaseAdmin.firestore().collection('users').limit(1).get();
}
