module.exports = {
  preset: 'ts-jest',
  coverageDirectory: 'coverage',
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tests/tsconfig.json',
    },
  },
  setupFilesAfterEnv: ['jest-extended'],
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.ts'],
  testPathIgnorePatterns: ['<rootDir>/tests/helpers/'],
};
