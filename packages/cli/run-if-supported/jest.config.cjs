module.exports = {
  preset: '../../../jest-preset/swc.cjs',
  coverageDirectory: 'coverage',
  extensionsToTreatAsEsm: ['.mts', '.ts'],
  moduleFileExtensions: ['js', 'mjs', 'cjs', 'ts', 'mts', 'cts', 'json', 'node'],
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.{ts,mts,cts}'],
  testPathIgnorePatterns: [
    '<rootDir>/tests/fixtures/',
    '<rootDir>/tests/helpers/',
  ],
};
