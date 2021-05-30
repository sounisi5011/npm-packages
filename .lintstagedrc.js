// @ts-check
const fs = require('fs');
const path = require('path');

/**
 * @param {string|RegExp} basename
 * @returns {function(string): boolean}
 */
function baseFilter(basename) {
  return typeof basename === 'string'
    ? filename => path.basename(filename) === basename
    : filename => basename.test(path.basename(filename));
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

    if (
      filenames.some(baseFilter('.eslintignore'))
      || filenames.some(baseFilter(/^(?:dprint|\.dprint)(?:-.*)?\.json$/))
    ) {
      commands.push(
        'pnpm run build:dprint-config',
        'git add ./.dprint.json ./.dprint-*.json',
      );
    }

    const tsFiles = filenames.filter(extFilter('ts'));
    if (tsFiles.length >= 1) {
      commands.push(
        `pnpm run fmt:ts:dprint -- ${tsFiles.join(' ')}`,
      );
    }

    const jsFiles = filenames.filter(extFilter('js', 'cjs', 'mjs'));
    if (jsFiles.length >= 1) {
      commands.push(
        `pnpm run fmt:js:dprint -- ${jsFiles.join(' ')}`,
      );
    }

    const tsOrJsFiles = [...tsFiles, ...jsFiles];
    if (tsOrJsFiles.length >= 1) {
      commands.push(
        `eslint --cache --fix ${tsOrJsFiles.join(' ')}`,
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
