import {RepositoryType} from '../db/repositories';

export const databaseConfig = {
  type: (process.env.DATABASE_TYPE || 'firestore') as RepositoryType,
} as const;

// Validate database type
if (!['sqlite', 'firestore'].includes(databaseConfig.type)) {
  throw new Error(
    `Invalid DATABASE_TYPE: ${databaseConfig.type}. Must be either 'sqlite' or 'firestore'`,
  );
}
