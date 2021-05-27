// @ts-check
const path = require('path');

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

    commands.push(`prettier --write ${filenames.join(' ')}`);

    const pkgFiles = filenames.filter(baseFilter('package.json'));
    if (pkgFiles.length >= 1) {
      commands.push(
        `node ./scripts/format-package-json.js --write ${pkgFiles.join(' ')}`,
      );
    }

    const tsOrJsFiles = filenames.filter(extFilter('ts', 'js'));
    if (tsOrJsFiles.length >= 1) {
      commands.push(
        `eslint --fix ${tsOrJsFiles.join(' ')}`,
      );
    }

    const submoduleReadmeFiles = filenames
      .filter(baseFilter('README.md'))
      .filter(filename => path.dirname(path.resolve(filename)) !== __dirname);
    if (submoduleReadmeFiles.length >= 1) {
      commands.push(
        `node ./scripts/update-readme-badge.js ${submoduleReadmeFiles.join(' ')}`,
      );
    }

    return commands;
  },
};
