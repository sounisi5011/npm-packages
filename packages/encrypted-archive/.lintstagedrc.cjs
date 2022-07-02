// @ts-check

const path = require('path');

const baseConfig = require('../../.lintstagedrc.cjs');

/**
 * @param {string} pathname
 * @returns {string}
 */
function p(pathname) {
  return path.resolve(__dirname, pathname);
}

/**
 * @param {[string, ...string[]]} dirnameSegments
 * @param {boolean} startsWith
 * @returns {function(string): boolean}
 */
function dirnameFilter(dirnameSegments, startsWith = false) {
  const dirname = path.resolve(...dirnameSegments);
  return startsWith
    ? filename => path.resolve(filename).startsWith(dirname + path.sep)
    : filename => path.dirname(path.resolve(filename)) === dirname;
}

/**
 * @param  {[string, ...string[]]} searchStringList
 * @returns {function(string): boolean}
 */
function endsWithFilter(...searchStringList) {
  return filename => searchStringList.some(searchString => filename.endsWith(searchString));
}

/**
 * @type {import('../../.lintstagedrc.cjs').LintStagedConfig}
 */
module.exports = async filenames => {
  /** @type {string[]} */
  const parallelScriptsList = [];
  /** @type {string[]} */
  const updatePathspecList = [];

  if (
    filenames
      .filter(dirnameFilter([__dirname, 'src'], true))
      .some(endsWithFilter('.proto', '_pb.js', '_pb.d.ts'))
  ) {
    parallelScriptsList.push('build-protobuf:src');
    updatePathspecList.push(
      ...['src/**/*.proto', 'src/**/*_pb.js', 'src/**/*_pb.d.ts'].map(p),
    );
  }
  if (
    filenames
      .filter(dirnameFilter([__dirname, 'tests/unit/fixtures']))
      .some(endsWithFilter('.prototxt', '.bin'))
  ) {
    parallelScriptsList.push('build-protobuf:test');
    updatePathspecList.push(
      ...['tests/unit/fixtures/*.prototxt', 'tests/unit/fixtures/*.bin'].map(p),
    );
  }

  /** @type {string[]} */
  const commands = [];
  if (parallelScriptsList.length > 0) {
    commands.push(`concurrently ${parallelScriptsList.map(s => `pnpm:${s}`).join(' ')}`);
  }
  if (updatePathspecList.length > 0) commands.push(`git add ${updatePathspecList.join(' ')}`);
  return [...commands, ...(await baseConfig(filenames))];
};
