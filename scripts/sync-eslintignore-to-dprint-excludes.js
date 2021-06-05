// @ts-check

const { promises: fsAsync } = require('fs');
const path = require('path');

const { awaitMainFn } = require('@sounisi5011/cli-utils-top-level-await');

/**
 * @param {string} message
 */
function reportError(message) {
  process.exitCode = 1;
  console.error(message);
}

/**
 * @param {string} line
 * @returns {string}
 */
function formatIgnoreLine(line) {
  const match = /^(?!!?\/)(!?)(?:\*\*\/)?(.+)$/.exec(line);
  return match ? `${match[1]}**/${match[2]}` : line;
}

/**
 * ESLint needs to use the `!.*` pattern to include the dot file.
 * However, dprint seems to include the dot file by default.
 *
 * @param {string} line
 * @returns {boolean}
 */
function excludeDotFilePattern(line) {
  return !/^!(?:\*\*\/)?\.\*$/.test(line);
}

async function main() {
  const cwd = process.cwd();
  const [, , eslintignoreFilename, ...dprintConfigFilenameList] = process.argv;

  if (!eslintignoreFilename) {
    reportError(`Target .eslintignore file is not specified.`);
    return;
  }
  if (dprintConfigFilenameList.length < 1) {
    reportError(`Target dprint config files are not specified.`);
    return;
  }

  const eslintignoreText = await fsAsync.readFile(path.resolve(cwd, eslintignoreFilename), 'utf8');
  const ignoreList = eslintignoreText
    .split(/[\r\n]+/)
    .filter(line => line && !line.startsWith('#'))
    .filter(excludeDotFilePattern)
    .map(formatIgnoreLine);

  if (ignoreList.length < 1) return;

  for (const dprintConfigFilename of dprintConfigFilenameList) {
    const dprintConfigFilepath = path.resolve(cwd, dprintConfigFilename);
    const dprintConfigOrigText = await fsAsync.readFile(dprintConfigFilepath, 'utf8');

    // Note: dprint.json is a JSONC. This parsing approach is not correct.
    const dprintConfig = JSON.parse(dprintConfigOrigText) || {};
    const excludes = dprintConfig.excludes;
    if (!Array.isArray(excludes)) continue;

    const excludeList = excludes
      .filter(excludeDotFilePattern)
      .map(formatIgnoreLine)
      .filter(line =>
        !ignoreList.includes(line.replace(/\/+$/, ''))
        && !ignoreList.includes(line.replace(/\/*$/, '/'))
      );
    dprintConfig.excludes = [
      ...ignoreList,
      ...excludeList,
    ];

    const dprintConfigNewText = JSON.stringify(dprintConfig, null, 2);
    if (dprintConfigOrigText !== dprintConfigNewText) {
      await fsAsync.writeFile(dprintConfigFilepath, dprintConfigNewText);
    }
  }
}

awaitMainFn(main);
