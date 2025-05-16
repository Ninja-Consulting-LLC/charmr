import {Database} from '../types';
import {MessageRepository, SQLiteMessageRepository} from './messageRepository';

let messageRepository: MessageRepository | null = null;

export const getMessageRepository = (db: Database): MessageRepository => {
  if (!messageRepository) {
    messageRepository = new SQLiteMessageRepository(db);
  }
  return messageRepository;
};
