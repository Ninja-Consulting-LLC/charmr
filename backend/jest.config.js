const useSqlite = process.env.DATABASE_TYPE === 'sqlite';

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/../__tests__'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  testTimeout: 10000, // 10 seconds
  setupFiles: ['<rootDir>/jest.setup.js'],
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
