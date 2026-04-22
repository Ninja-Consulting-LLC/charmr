import {databaseConfig} from '../config/database';
import logger from '../utils/logger';
import {
  createFirestoreAdapter,
  FirestoreRepositoryBundle,
} from './createFirestoreAdapter';
import {FirestoreMatchRepository} from './repositories/firestoreMatchRepository';
import {FirestoreMessageCostRepository} from './repositories/firestoreMessageCostRepository';
import {FirestoreMessageRepository} from './repositories/firestoreMessageRepository';
import {FirestoreSupportRepository} from './repositories/firestoreSupportRepository';
import {FirestoreUserRepository} from './repositories/firestoreUserRepository';
import {createSqliteDatabase} from './sqlite';
import {Database} from './types';

let db: Database | null = null;

export const getDatabase = async (): Promise<Database> => {
  if (!db) {
    logger.debug('Initializing database', {type: databaseConfig.type});
    if (databaseConfig.type === 'firestore') {
      logger.debug('Firestore instance obtained, initializing repositories');
      const bundle: FirestoreRepositoryBundle = {
        userRepository: new FirestoreUserRepository(),
        messageRepository: new FirestoreMessageRepository(),
        matchRepository: new FirestoreMatchRepository(),
        messageCostRepository: new FirestoreMessageCostRepository(),
        supportRepository: new FirestoreSupportRepository(),
      };
      db = createFirestoreAdapter(bundle);
      logger.debug('Firestore repositories initialized successfully');
    } else {
      db = await createSqliteDatabase();
    }
  }
  return db;
};
