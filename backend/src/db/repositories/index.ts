import {databaseConfig} from '../../config/database';
import {Database} from '../types';
import {FirestoreMessageRepository} from './firestoreMessageRepository';
import {MessageRepository, SQLiteMessageRepository} from './messageRepository';

let firestoreMessageRepository: FirestoreMessageRepository | null = null;
const sqliteMessageRepositoryByDb = new WeakMap<object, MessageRepository>();

export type RepositoryType = 'sqlite' | 'firestore';

export const getMessageRepository = (db: Database): MessageRepository => {
  if (databaseConfig.type === 'firestore') {
    if (!firestoreMessageRepository) {
      firestoreMessageRepository = new FirestoreMessageRepository();
    }
    return firestoreMessageRepository;
  }
  if (!('run' in db)) {
    throw new Error(
      'SQLite Database instance required for SQLiteMessageRepository',
    );
  }
  const dbKey = db as object;
  let repo = sqliteMessageRepositoryByDb.get(dbKey);
  if (!repo) {
    repo = new SQLiteMessageRepository(db as Database);
    sqliteMessageRepositoryByDb.set(dbKey, repo);
  }
  return repo;
};
