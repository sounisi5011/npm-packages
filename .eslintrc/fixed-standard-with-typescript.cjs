// @ts-check
const path = require('path');

const config = require('eslint-config-standard-with-typescript');

module.exports = {
  ...config,
  overrides: config.overrides.map(overrideConfig => ({
    ...overrideConfig,
    /**
     * Add .mts and .cts in addition to the .ts extension
     */
    files: [overrideConfig.files]
      .flat()
      .map(file => {
        if (/\.[cm]ts$/.test(file)) {
          throw new Error(
            `eslint-config-standard-with-typescript now supports TypeScript 4.7. This file '${
              path.basename(__filename)
            }' is no longer needed.`,
          );
        }
        return file.replace(/\.ts$/, '.{ts,cts,mts}');
      }),
  })),
};
