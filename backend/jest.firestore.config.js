/**
 * Firestore repository tests against the local emulator.
 * Run: firebase emulators:exec --only firestore "npm run test:firestore -w charmr-backend"
 * (Fresh Node process so Firebase Admin is not already initialized from the SQLite suite.)
 */
module.exports = {
  displayName: 'firestore',
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/test/firestore'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  setupFiles: [
    '<rootDir>/src/test/firestore/setup-env.cjs',
    '<rootDir>/jest.setup.js',
  ],
  setupFilesAfterEnv: [
    '<rootDir>/src/test/setup.ts',
    '<rootDir>/src/test/firestore/jest-setup-after-env.ts',
  ],
  testTimeout: 30000,
  maxWorkers: 1,
  maxConcurrency: 1,
  moduleNameMapper: {
    '^@charmr/shared$': '<rootDir>/../packages/shared/dist/index.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(uuid|@google-cloud|@grpc|google-gax|protobufjs)/)',
  ],
};
