// @ts-check
const path = require('path');

/**
 * @param {string} fullPath
 * @param {string} searchPath
 * @returns {boolean}
 */
function startsWith(fullPath, searchPath) {
  return fullPath.startsWith(
    (
      path.resolve(searchPath)
        .replace(new RegExp(`\\${path.sep}+$`), '')
    ) + path.sep,
  );
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

/**
 * @param {function(string): boolean} fn
 * @returns {function(string): boolean}
 */
function not(fn) {
  return filename => !fn(filename);
}

module.exports = {
  /**
   * @param {string[]} filenames
   */
  '*': filenames => {
    /** @type {string[]} */
    const commands = [];

    const prettierTargetFiles = filenames.filter(not(extFilter('fbs')));
    if (prettierTargetFiles.length >= 1) {
      commands.push(
        `prettier --write ${prettierTargetFiles.join(' ')}`,
      );
    }

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

    const flatbuffersFiles = filenames.filter(extFilter('fbs'));
    if (flatbuffersFiles.length >= 1) {
      const generatedTsFiles = flatbuffersFiles.map(flatbuffersFile =>
        flatbuffersFile.replace(/\.fbs$/, '_generated.ts')
      );
      commands.push(
        ...flatbuffersFiles
          .map(flatbuffersFile => `flatc --ts -o ${path.dirname(flatbuffersFile)} ${flatbuffersFile}`),
        `fix-flatbuffers-generated-ts ${generatedTsFiles.join(' ')}`,
        `git add ${generatedTsFiles.join(' ')}`,
      );
    }

    if (filenames.some(filename => startsWith(filename, 'actions'))) {
      commands.push(
        'pnpm recursive run build --filter ./actions/',
        'git add ./actions/*/dist/**',
      );
    }

    return commands;
  },
};
