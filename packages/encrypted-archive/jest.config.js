module.exports = {
  preset: '../../jest-preset/swc.cjs',
  coverageDirectory: 'coverage',
  setupFilesAfterEnv: ['jest-extended/all', '@sounisi5011/jest-binary-data-matchers'],
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.ts'],
  testPathIgnorePatterns: ['<rootDir>/tests/helpers/'],
};
