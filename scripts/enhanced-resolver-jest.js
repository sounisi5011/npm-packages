// @ts-check

const fs = require('fs');
const path = require('path');

const { ResolverFactory } = require('enhanced-resolve');

/**
 * @typedef {{
 *   basedir: string;
 *   conditions?: Array<string>;
 *   defaultResolver: (path: string, options: ResolverOptions) => string;
 *   extensions?: Array<string>;
 *   moduleDirectory?: Array<string>;
 *   paths?: Array<string>;
 *   packageFilter?: (pkg: object, file: string, dir: string) => object;
 *   pathFilter?: (pkg: object, path: string, relativePath: string) => string;
 *   rootDir?: string;
 * }} ResolverOptions
 * @param {string} modulePath
 * @param {ResolverOptions} options
 * @returns {string}
 * @see https://github.com/jamiebuilds/jest-enhanced-resolve/blob/a4fb6ad538f8ccc2911f0383fa4a24dbdc943510/src/jest-enhanced-resolve.ts
 */
module.exports = (modulePath, options) => {
  if (!(modulePath.startsWith('.') || modulePath.startsWith(path.sep))) {
    const enhancedResolver = ResolverFactory.createResolver({
      // @ts-expect-error
      fileSystem: fs,
      mainFields: ['source', 'module', 'main'],
      useSyncFileSystemCalls: true,
    });

    const result = enhancedResolver.resolveSync({}, options.basedir, modulePath);
    if (result) {
      return fs.realpathSync(result);
    }
  }
  return options.defaultResolver(modulePath, options);
};
