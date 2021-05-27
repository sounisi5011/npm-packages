// @ts-check
const fs = require('fs');
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

    const readmeFiles = filenames.filter(baseFilter('README.md'));
    const packageListFiles = filenames.filter(baseFilter('.package-list.js'));
    if (pkgFiles.length >= 1 || readmeFiles.length >= 1 || packageListFiles.length >= 1) {
      commands.push(
        'run-s build:package-list',
        'git add ./README.md',
      );
    }

    const submoduleReadmeFiles = unique(
      [...readmeFiles, ...pkgFiles]
        .filter(filename => path.dirname(path.resolve(filename)) !== __dirname)
        .map(filename => path.join(path.dirname(filename), 'README.md')),
    )
      .filter(filename => fs.existsSync(filename));
    if (submoduleReadmeFiles.length >= 1) {
      commands.push(
        `node ./scripts/update-readme-badge.js ${submoduleReadmeFiles.join(' ')}`,
        `git add ${submoduleReadmeFiles.join(' ')}`,
      );
    }

    return commands;
  },
};
