module.exports = {
  preset: 'react-native',
  modulePathIgnorePatterns: [
    '<rootDir>/example/node_modules',
    '<rootDir>/dist/',
  ],
  // preset: 'ts-jest'
  transform: require('ts-jest/jest-preset.js').transform,
  coverageDirectory: 'coverage',
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tests/tsconfig.json',
    },
  },
  setupFilesAfterEnv: ['jest-extended/all', '@sounisi5011/jest-binary-data-matchers'],
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.ts'],
  testPathIgnorePatterns: ['<rootDir>/tests/helpers/'],
};
