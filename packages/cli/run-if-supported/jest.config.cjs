module.exports = {
  ...require('../../../jest.config.base.cjs'),
  coverageDirectory: 'coverage',
  extensionsToTreatAsEsm: ['.mts', '.ts'],
  moduleFileExtensions: ['js', 'mjs', 'cjs', 'ts', 'mts', 'cts', 'json', 'node'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^(\\.{1,2}/.*\\.[mc])js$': '$1ts',
  },
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.ts'],
  testPathIgnorePatterns: [
    '<rootDir>/tests/fixtures/',
    '<rootDir>/tests/helpers/',
  ],
  transform: { '^.+\\.[mc]?ts$': '@swc/jest' },
};
