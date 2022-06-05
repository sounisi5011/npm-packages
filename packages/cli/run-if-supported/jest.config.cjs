module.exports = {
  ...require('../../../jest.config.base.cjs'),
  preset: 'ts-jest',
  coverageDirectory: 'coverage',
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tests/tsconfig.json',
    },
  },
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.ts'],
  testPathIgnorePatterns: [
    '<rootDir>/tests/fixtures/',
    '<rootDir>/tests/helpers/',
  ],
};
