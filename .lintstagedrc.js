// @ts-check
const path = require('path');

/**
 * @param {function(string): boolean} func
 * @returns {function(string): boolean}
 */
function negate(func) {
  return filename => !func(filename);
}

/**
 * @param {string} basename
 * @returns {function(string): boolean}
 */
function baseFilter(basename) {
  return filename => path.basename(filename) === basename;
}

/**
 * @param  {...string} extList
 * @returns {function(string): boolean}
 */
function extFilter(...extList) {
  extList = extList.map(ext => ext.replace(/^\.?/, '.'));
  return filename => extList.includes(path.extname(filename));
}

module.exports = {
  /**
   * @param {string[]} filenames
   */
  '*': filenames => {
    /** @type {string[]} */
    const commands = [];

    const prettierTargetFiles = filenames
      .filter(extFilter('json', 'yaml', 'yml'))
      .filter(negate(baseFilter('pnpm-lock.yaml')));
    if (prettierTargetFiles.length >= 1) {
      commands.push(
        `prettier --write ${prettierTargetFiles.join(' ')}`,
      );
    }

    const pkgFiles = filenames.filter(baseFilter('package.json'));
    if (pkgFiles.length >= 1) {
      commands.push(
        `prettier-package-json --write ${pkgFiles.join(' ')}`,
        `sort-package-json ${pkgFiles.join(' ')}`,
      );
    }

    const tsOrJsFiles = filenames.filter(extFilter('ts', 'js'));
    if (tsOrJsFiles.length >= 1) {
      commands.push(
        `eslint --fix ${tsOrJsFiles.join(' ')}`,
      );
    }

    return commands;
  },
};
