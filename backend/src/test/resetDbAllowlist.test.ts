import {afterEach, describe, expect, it} from '@jest/globals';
import {isEmailAllowedToResetDatabase} from '../utils/resetDbAllowlist';

describe('isEmailAllowedToResetDatabase', () => {
  const saved = process.env.CHARMR_RESET_DB_ALLOWLIST;
  const savedNode = process.env.NODE_ENV;

  afterEach(() => {
    if (saved === undefined) {
      delete process.env.CHARMR_RESET_DB_ALLOWLIST;
    } else {
      process.env.CHARMR_RESET_DB_ALLOWLIST = saved;
    }
    process.env.NODE_ENV = savedNode;
  });

  it('denies when email missing', () => {
    expect(isEmailAllowedToResetDatabase(undefined)).toBe(false);
  });

  it('allows listed email case-insensitively', () => {
    process.env.CHARMR_RESET_DB_ALLOWLIST = 'A@x.com, b@y.com';
    expect(isEmailAllowedToResetDatabase('a@x.com')).toBe(true);
    expect(isEmailAllowedToResetDatabase('B@Y.COM')).toBe(true);
  });

  it('production with empty allowlist denies', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.CHARMR_RESET_DB_ALLOWLIST;
    expect(isEmailAllowedToResetDatabase('any@x.com')).toBe(false);
  });

  it('non-production with empty allowlist allows', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.CHARMR_RESET_DB_ALLOWLIST;
    expect(isEmailAllowedToResetDatabase('any@x.com')).toBe(true);
  });
});
