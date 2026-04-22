import {afterAll, beforeAll, describe, expect, it} from '@jest/globals';
import {getDatabase} from '../db';
import {pingDatabase} from '../db/pingDatabase';

describe('pingDatabase (sqlite)', () => {
  let db: Awaited<ReturnType<typeof getDatabase>>;

  beforeAll(async () => {
    db = await getDatabase();
  });

  afterAll(async () => {
    await db.clearDatabase();
  });

  it('resolves when the database answers', async () => {
    await expect(pingDatabase(db)).resolves.toBeUndefined();
  });
});
