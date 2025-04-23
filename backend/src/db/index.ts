import logger from '../utils/logger';
import {createSqliteDatabase} from './sqlite';
import {Database} from './types';

let dbInstance: Database | null = null;

export const getDatabase = async (): Promise<Database> => {
  if (dbInstance) {
    return dbInstance;
  }

  logger.info('Initializing SQLite database');
  dbInstance = await createSqliteDatabase();
  return dbInstance;
};
