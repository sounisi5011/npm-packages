module.exports = {
  preset: 'ts-jest',
  coverageDirectory: 'coverage',
  resolver: '<rootDir>/../../../scripts/enhanced-resolver-jest',
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tests/tsconfig.json',
    },
  },
  setupFilesAfterEnv: [
    './jest.setup.cjs',
  ],
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.ts'],
  testPathIgnorePatterns: ['<rootDir>/tests/helpers/'],
};
