// @ts-check
const path = require('path');

/**
 * @param {Array<string>} basenameList
 * @returns {function(string): boolean}
 */
function baseFilter(...basenameList) {
  return filename => basenameList.includes(path.basename(filename));
}

/**
 * @param  {...string} extList
 * @returns {function(string): boolean}
 */
function extFilter(...extList) {
  extList = extList.map(ext => ext.replace(/^\.?/, '.'));
  return filename => extList.includes(path.extname(filename));
}

/**
 * @template T
 * @param {readonly T[]} array
 * @returns {T[]}
 */
function unique(array) {
  return [...new Set(array)];
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

    const submoduleReadmeFiles = unique(
      filenames
        .filter(baseFilter('README.md', 'package.json'))
        .filter(filename => path.dirname(path.resolve(filename)) !== __dirname)
        .map(filename => path.join(path.dirname(filename), 'README.md')),
    );
    if (submoduleReadmeFiles.length >= 1) {
      commands.push(
        `node ./scripts/update-readme-badge.js ${submoduleReadmeFiles.join(' ')}`,
        `git add ${submoduleReadmeFiles.join(' ')}`,
      );
    }

    return commands;
  },
};
