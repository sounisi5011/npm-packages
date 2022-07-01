// @ts-check

/**
 * @typedef {import("../packages/check-pid-file/node_modules/@swc/core").Config} SwcConfig
 * @typedef {import("../packages/check-pid-file/node_modules/@swc/core").Es6Config} SwcEs6ModuleConfig
 * @typedef {import("../packages/check-pid-file/node_modules/@swc/core").CommonJsConfig} SwcCommonJsModuleConfig
 * @typedef {Omit<SwcConfig, 'module'> & { module?: Omit<SwcEs6ModuleConfig | SwcCommonJsModuleConfig, 'type'> }} SwcJestConfig
 *   `@swc/jest` always overrides the `module.type` option to `"es6"` or `"commonjs"`.
 *   So there is no need to specify the `module.type` option.
 *   see https://github.com/swc-project/jest/blob/v0.2.21/index.ts#L33-L36
 */

/**
 * By default, @swc/jest@0.2.21 and @swc/core@1.2.203 does not seem to detect that .mts files are TypeScript.
 * This behavior seems to be resolved by setting the compile config.
 * @type {SwcJestConfig}
 * @see https://swc.rs/docs/configuration/compilation
 */
const swcConfig = {
  jsc: {
    parser: {
      syntax: 'typescript',
    },
  },
  module: {
    /**
     * This option is required to import CommonJS files from the Node.js native ESM.
     * @see https://github.com/swc-project/swc/issues/5084
     */
    importInterop: 'node',
  },
};

/** @type { import('@jest/types').Config.InitialOptions } */
module.exports = {
  /**
   * In ES Modules, the file extension cannot be omitted.
   * TypeScript can read `.ts` files with the `.js` extension.
   * So add the `moduleNameMapper` option and let Jest find `.ts` files.
   * @see https://kulshekhar.github.io/ts-jest/docs/guides/esm-support/
   */
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^(\\.{1,2}/.*\\.[mc])js$': '$1ts',
  },
  transform: {
    '\\.[mc]?ts$': ['@swc/jest', swcConfig],
  },
};
