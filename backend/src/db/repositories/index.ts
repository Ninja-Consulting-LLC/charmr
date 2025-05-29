import {databaseConfig} from '../../config/database';
import {Database} from '../types';
import {FirestoreMessageRepository} from './firestoreMessageRepository';
import {MessageRepository, SQLiteMessageRepository} from './messageRepository';

let messageRepository: MessageRepository | null = null;

export type RepositoryType = 'sqlite' | 'firestore';

export const getMessageRepository = (db: Database): MessageRepository => {
  if (!messageRepository) {
    if (databaseConfig.type === 'firestore') {
      messageRepository = new FirestoreMessageRepository();
    } else {
      if (!('run' in db)) {
        throw new Error(
          'SQLite Database instance required for SQLiteMessageRepository',
        );
      }
      messageRepository = new SQLiteMessageRepository(db as Database);
    }
  }
  return messageRepository;
};
