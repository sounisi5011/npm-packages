module.exports = {
  preset: '../../../jest-preset/swc.cjs',
  coverageDirectory: 'coverage',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.ts'],
  testPathIgnorePatterns: ['<rootDir>/tests/helpers/'],
};
