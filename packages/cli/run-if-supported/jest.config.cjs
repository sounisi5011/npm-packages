module.exports = {
  ...require('../../../jest.config.base.cjs'),
  preset: 'ts-jest/presets/default-esm',
  coverageDirectory: 'coverage',
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tests/tsconfig.json',
      useESM: true,
    },
  },
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
  transform: { '^.+\\.[mc]?ts$': 'ts-jest' },
};
