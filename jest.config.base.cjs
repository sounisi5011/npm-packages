module.exports = {
  /**
   * Jest 2.7.51 does not detect the `exports` field in `package.json`.
   * So change resolver to `jest-node-exports-resolver`.
   */
  resolver: 'jest-node-exports-resolver',
};
