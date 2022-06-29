const { gen } = require('../../../jest.config.base.cjs');

module.exports = gen({
  preset: '../../../jest-preset/swc.cjs',
  coverageDirectory: 'coverage',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.ts'],
});
