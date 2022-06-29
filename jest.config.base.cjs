// @ts-check

const physicalCores = require('physical-cores').default;

/**
 * @typedef {import('@jest/types').Config.InitialOptions} JestOptions
 * @param {JestOptions | PromiseLike<JestOptions> | (() => JestOptions | PromiseLike<JestOptions>)} config
 * @return {Promise<JestOptions>}
 */
async function gen(config) {
  const configObj = await (typeof config === 'function' ? config() : config);
  return {
    /**
     * @see https://zenn.dev/tkiryu/articles/a6a43bd9d043b0
     */
    maxWorkers: physicalCores - 1,
    ...configObj,
  };
}

/**
 * @param {JestOptions | PromiseLike<JestOptions> | (() => JestOptions | PromiseLike<JestOptions>)} config
 * @return {() => Promise<JestOptions>}
 * @see https://jestjs.io/ja/docs/configuration
 */
exports.gen = config => () => gen(config);
