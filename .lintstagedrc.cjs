// @ts-check
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

/**
 * @param {string} pathname
 * @returns {string}
 */
function rootPath(pathname) {
  return path.resolve(__dirname, pathname);
}

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
 * @param {[string, ...string[]]} dirnameSegments
 * @returns {function(string): boolean}
 */
function dirnameFilter(...dirnameSegments) {
  const dirname = path.resolve(...dirnameSegments);
  return filename => path.dirname(path.resolve(filename)) === dirname;
}

/**
 * @param {function(string): boolean} fn
 * @returns {function(string): boolean}
 */
function not(fn) {
  return filename => !fn(filename);
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
  const configOption = ['-c', rootPath(config)];

  const { stdout } = await execFileAsync('pnpm', ['exec', 'dprint', 'output-file-paths', ...configOption]);
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
 * @typedef {(filenames: string[]) => string | string[] | Promise<string | string[]>} LintStagedConfigFunc
 * @typedef {LintStagedConfigFunc | Object<string, string | string[] | LintStagedConfigFunc>} LintStagedConfig
 * @see https://github.com/okonet/lint-staged/tree/v12.4.2#using-js-configuration-files
 */

/**
 * @type {LintStagedConfigFunc}
 */
module.exports = async filenames => {
  /** @type {string[]} */
  const commands = [];

  // Prettier will find the configuration files based on cwd.
  // If inside submodule directories, Prettier will fail because cwd is not the project root.
  // To work around this, Prettier is run using the project root npm-script.
  commands.push(`pnpm run --workspace-root root:prettier -- --write ${filenames.join(' ')}`);

  const pkgFiles = filenames.filter(baseFilter('package.json'));
  if (pkgFiles.length >= 1) {
    commands.push(
      `prettier-package-json --write ${pkgFiles.join(' ')}`,
      `sort-package-json ${pkgFiles.join(' ')}`,
    );
  }

  const rootFilenames = filenames.filter(dirnameFilter(__dirname));
  if (
    rootFilenames.some(baseFilter('.eslintignore'))
    || rootFilenames.some(baseFilter(/^(?:dprint|\.dprint)(?:-.*)?\.json$/))
  ) {
    commands.push(
      'pnpm run --workspace-root build:dprint-config',
      `git add ${['./.dprint.json', './.dprint-*.json'].map(rootPath).join(' ')}`,
    );
  }

  const actionsWorkflowFiles = filenames.filter(filename =>
    /(?:^|[/\\])\.github[/\\]workflows[/\\][^/\\]+\.(?:yaml|yml)$/.test(filename)
  );
  if (actionsWorkflowFiles.length >= 1) {
    commands.push(
      `actionlint ${actionsWorkflowFiles.join(' ')}`,
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
      // ESLint will find the configuration files based on cwd.
      // If inside submodule directories, ESLint will fail because cwd is not the project root.
      // To work around this, ESLint is run using the project root npm-script.
      `pnpm run --workspace-root root:eslint -- --cache --fix ${tsOrJsFiles.join(' ')}`,
    );
  }

  if (
    pkgFiles.length >= 1
    || rootFilenames.some(baseFilter('README.md'))
    || rootFilenames.some(baseFilter('.package-list.js'))
  ) {
    commands.push(
      'pnpm run --workspace-root build:package-list',
      `git add ${rootPath('README.md')}`,
    );
  }

  const submoduleReadmeFiles = unique(
    [...filenames.filter(baseFilter('README.md')), ...pkgFiles]
      .filter(not(dirnameFilter(__dirname)))
      .map(filename => path.join(path.dirname(filename), 'README.md')),
  )
    .filter(filename => fs.existsSync(filename));
  if (submoduleReadmeFiles.length >= 1) {
    commands.push(
      `node ${rootPath('scripts/update-readme-badge.js')} ${submoduleReadmeFiles.join(' ')}`,
      `git add ${submoduleReadmeFiles.join(' ')}`,
    );
  }

  return commands;
};
