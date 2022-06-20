/**
 * By default, @swc/jest@0.2.21 and @swc/core@1.2.203 does not seem to detect that .mts files are TypeScript.
 * This behavior seems to be resolved by setting the compile config.
 * @see https://swc.rs/docs/configuration/compilation
 */
const swcConfig = {
  jsc: {
    parser: {
      syntax: 'typescript',
    },
  },
};

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
  testMatch: ['<rootDir>/tests/**/*.{ts,mts,cts}'],
  testPathIgnorePatterns: [
    '<rootDir>/tests/fixtures/',
    '<rootDir>/tests/helpers/',
  ],
  transform: { '^.+\\.[mc]?ts$': ['@swc/jest', swcConfig] },
};
