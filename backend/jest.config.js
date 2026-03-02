module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/../__tests__'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  testTimeout: 10000, // 10 seconds
  setupFiles: ['<rootDir>/jest.setup.js'],
  // Allow ES modules for uuid and @google-cloud/firestore
  transformIgnorePatterns: [
    'node_modules/(?!(uuid|@google-cloud|@grpc|google-gax|protobufjs)/)',
  ],
};
