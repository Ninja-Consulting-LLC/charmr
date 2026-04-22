const useSqlite = process.env.DATABASE_TYPE === 'sqlite';

/**
 * Excluded from coverage %:
 * - bootstrap / Express wiring
 * - route modules (thin glue; exercised via HTTP + controller tests)
 * - Firestore SDK wiring + repos (`npm run test:firestore` with emulator)
 */
const coveragePathIgnorePatterns = [
  '/node_modules/',
  '<rootDir>/src/index.ts',
  '<rootDir>/src/app.ts',
  '<rootDir>/src/routes/',
  /** HTTP surface covered via `routesHttp.test.ts`; many branches are auth/plan edge cases. */
  '<rootDir>/src/controllers/matchController.ts',
  '<rootDir>/src/config/firebase-admin.ts',
  '<rootDir>/src/db/index.ts',
  '<rootDir>/src/db/sqlite.ts',
  '<rootDir>/src/db/firestore.ts',
  '<rootDir>/src/db/repositories/firestoreMatchRepository.ts',
  '<rootDir>/src/db/repositories/firestoreMessageCostRepository.ts',
  '<rootDir>/src/db/repositories/firestoreMessageRepository.ts',
  '<rootDir>/src/db/repositories/firestoreSupportRepository.ts',
  '<rootDir>/src/db/repositories/firestoreUserRepository.ts',
  '<rootDir>/src/db/createFirestoreAdapter.ts',
  '<rootDir>/src/validation/',
  '<rootDir>/src/middleware/validateBody.ts',
  '<rootDir>/src/services/scheduledJobs.ts',
];

module.exports = {
  displayName: 'sqlite',
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/../__tests__'],
  testMatch: ['**/*.test.ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/src/test/firestore/',
  ],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  testTimeout: 10000, // 10 seconds
  setupFiles: ['<rootDir>/jest.setup.js'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/test/**',
  ],
  coveragePathIgnorePatterns,
  coverageThreshold: {
    global: {
      statements: 85,
      lines: 85,
      branches: 55,
      functions: 82,
    },
  },
  moduleNameMapper: {
    '^@charmr/shared$': '<rootDir>/../packages/shared/dist/index.js',
  },
  // One shared SQLite file + transactions: parallel workers cause SQLITE_BUSY.
  maxWorkers: useSqlite ? 1 : '50%',
  // Default maxConcurrency runs multiple `it()` blocks in one file at once → duplicate rows.
  maxConcurrency: useSqlite ? 1 : 5,
  // Allow ES modules for uuid and @google-cloud/firestore
  transformIgnorePatterns: [
    'node_modules/(?!(uuid|@google-cloud|@grpc|google-gax|protobufjs)/)',
  ],
};
