module.exports = {
  ...require('../../jest.config.base.cjs'),
  preset: 'ts-jest',
  coverageDirectory: 'coverage',
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tests/tsconfig.json',
    },
  },
  setupFilesAfterEnv: ['jest-extended/all', '@sounisi5011/jest-binary-data-matchers'],
  testEnvironment: 'node',
  // In Node.js 18, some tests now take more than 5000ms.
  testTimeout: 15 * 1000,
  testMatch: ['<rootDir>/tests/**/*.ts'],
  testPathIgnorePatterns: ['<rootDir>/tests/helpers/'],
};
