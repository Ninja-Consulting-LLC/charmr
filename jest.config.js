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
};
