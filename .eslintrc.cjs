/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  extends: '@react-native/eslint-config',
  ignorePatterns: [
    'node_modules/',
    'android/',
    'ios/',
    'backend/',
    'website/',
    '**/dist/',
    'packages/shared/dist/',
    'coverage/',
  ],
  rules: {
    '@typescript-eslint/no-shadow': 'warn',
    'no-catch-shadow': 'off',
    'react-native/no-inline-styles': 'warn',
    'react/no-unstable-nested-components': 'warn',
    curly: 'warn',
    'eol-last': 'warn',
    'react-hooks/exhaustive-deps': 'warn',
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      rules: {
        '@typescript-eslint/no-unused-vars': [
          'warn',
          {
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
          },
        ],
      },
    },
  ],
};
