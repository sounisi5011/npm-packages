module.exports = {
  /**
   * In ES Modules, the file extension cannot be omitted.
   * TypeScript can read `.ts` files with the `.js` extension.
   * So add the `moduleNameMapper` option and let Jest find `.ts` files.
   * @see https://kulshekhar.github.io/ts-jest/docs/guides/esm-support/
   */
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
