import {afterEach, describe, expect, it, jest} from '@jest/globals';

describe('config/database type validation', () => {
  const original = process.env.DATABASE_TYPE;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.DATABASE_TYPE;
    } else {
      process.env.DATABASE_TYPE = original;
    }
    jest.resetModules();
  });

  it('throws when DATABASE_TYPE is not sqlite or firestore', async () => {
    process.env.DATABASE_TYPE = 'postgres';
    jest.resetModules();
    await expect(import('../config/database')).rejects.toThrow(
      /Invalid DATABASE_TYPE/,
    );
  });
});
