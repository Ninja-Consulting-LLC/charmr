module.exports = {
  preset: 'react-native',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?@?react-native|@react-native-community|@react-navigation)',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/android/',
    '/ios/',
    '<rootDir>/backend/',
    '<rootDir>/__tests__/',
    '<rootDir>/packages/',
    '<rootDir>/website/',
    '.*\\.integration\\.test\\.(ts|tsx|js|jsx)$',
  ],
  moduleNameMapper: {
    '^@charmr/shared$': '<rootDir>/packages/shared/dist/index.js',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/src/test/mocks/fileMock.js',
  },
  setupFiles: [
    '<rootDir>/node_modules/react-native-reanimated/mock.js',
    '<rootDir>/src/test/setup.ts',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/App.tsx',
    '!src/**/*.d.ts',
    '!src/test/**',
    '!src/**/__tests__/**',
    '!src/**/*.test.{ts,tsx}',
    // Type-only barrels / aliases — no executable product logic to cover here.
    '!src/types/**',
    '!src/types.ts',
    '!src/store/types.ts',
    '!src/store/index.ts',
    '!src/navigation/types.ts',
  ],
  // Raised incrementally as suites grow; large RN surface (screens, StoreProvider) keeps global % modest.
  coverageThreshold: {
    global: {
      statements: 39,
      branches: 30,
      functions: 32,
      lines: 39,
    },
  },
};
