// @ts-check
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

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

/**
 * @param {readonly string[]} filenames
 * @param {string} config
 * @returns {Promise<string[]>}
 */
async function dprintCommandList(filenames, config) {
  if (filenames.length < 1) return [];
  const configOption = ['-c', path.resolve(__dirname, config)];

  const { stdout } = await execFileAsync('pnpx', ['dprint', 'output-file-paths', ...configOption]);
  const dprintTargetFilepathList = stdout
    .split(/\r?\n|\r/)
    .filter(filepath => filepath.trim() !== '');

  const targetFilepathList = filenames
    .filter(filepath => dprintTargetFilepathList.includes(filepath));
  if (targetFilepathList.length < 1) return [];

  return [
    ['dprint', 'fmt', ...configOption, ...targetFilepathList].join(' '),
  ];
}

/**
 * @type {(filenames: string[]) => Promise<string | string[]>}
 */
module.exports = async filenames => {
  /** @type {string[]} */
  const commands = [];

  commands.push(`prettier --write ${filenames.join(' ')}`);

  const pkgFiles = filenames.filter(baseFilter('package.json'));
  if (pkgFiles.length >= 1) {
    commands.push(
      `prettier-package-json --write ${pkgFiles.join(' ')}`,
      `sort-package-json ${pkgFiles.join(' ')}`,
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
  const jsFiles = filenames.filter(extFilter('js', 'cjs', 'mjs'));

  commands.push(
    ...(
      await Promise.all([
        dprintCommandList(tsFiles, './.dprint.json'),
        dprintCommandList(jsFiles, './.dprint-js.json'),
      ])
    ).flat(),
  );

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
};
