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
    // Large RN surface: re-enable incrementally (run `npx eslint . --print-config file.tsx` when tuning).
    '@typescript-eslint/no-shadow': 'off',
    'no-catch-shadow': 'off',
    'react-native/no-inline-styles': 'off',
    'react/no-unstable-nested-components': 'off',
    curly: 'warn',
    'eol-last': 'warn',
    'react-hooks/exhaustive-deps': 'off',
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      rules: {
        '@typescript-eslint/no-unused-vars': 'off',
      },
    },
  ],
};
