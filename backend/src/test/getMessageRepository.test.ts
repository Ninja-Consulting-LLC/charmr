import {beforeEach, describe, expect, it} from '@jest/globals';
import {getDatabase} from '../db';
import {getMessageRepository} from '../db/repositories';

describe('getMessageRepository', () => {
  let db: Awaited<ReturnType<typeof getDatabase>>;

  beforeEach(async () => {
    db = await getDatabase();
  });

  it('returns the same SQLite repository instance per db object', () => {
    const a = getMessageRepository(db);
    const b = getMessageRepository(db);
    expect(a).toBe(b);
  });

  it('throws when database is not a SQLite-backed instance', () => {
    expect(() =>
      getMessageRepository({} as Parameters<typeof getMessageRepository>[0]),
    ).toThrow('SQLite Database instance required');
  });
});
