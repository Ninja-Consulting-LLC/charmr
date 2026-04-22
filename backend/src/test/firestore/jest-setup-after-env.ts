/**
 * `src/test/setup.ts` sets a 10s default timeout; Firestore emulator tests need more headroom.
 */
jest.setTimeout(60000);
