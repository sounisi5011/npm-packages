// @ts-check

const fs = require('fs');
const os = require('os');
const path = require('path');

/**
 * @param {string} name
 * @param {string} value
 * @returns {void}
 * @see https://github.blog/changelog/2022-10-11-github-actions-deprecating-save-state-and-set-output-commands/
 */
function setOutput(name, value) {
  // eslint-disable-next-line dot-notation
  const outputFilepath = process.env['GITHUB_OUTPUT'];
  if (outputFilepath) {
    /** @type {number|null} */
    let fd = null;
    try {
      /**
       * Open file for appending. An exception occurs if the file does not exist.
       * @see https://github.com/nodejs/node/issues/1592#issuecomment-223819785
       */
      fd = fs.openSync(outputFilepath, fs.constants.O_APPEND | fs.constants.O_WRONLY);
      /**
       * Note: With the `flag` option, there is no need to use the `fs.openSync()` function in the above line.
       *       However, it is not documented that the `flag` option can be passed a number.
       *       We use the `fs.openSync()` function to ensure that it will work in future Node.js.
       */
      fs.writeFileSync(fd, `${name}=${value}${os.EOL}`);
      return;
    } finally {
      if (typeof fd === 'number') {
        fs.closeSync(fd);
      }
    }
  }

  /**
   * If writing to the "GITHUB_OUTPUT" file fails, try the old approach.
   */
  console.log(`::set-output name=${name}::${value}`);
}

function main() {
  const pkgJsonPath = path.resolve('package.json');
  const pkg = require(pkgJsonPath);
  console.log(`Loaded ${pkgJsonPath}`);

  const { engines } = pkg;
  if (!engines) throw new Error('`engines` field is not defined');
  if (typeof engines !== 'object') throw new Error('`engines` field is not object value');

  const pnpmVersionRange = engines.pnpm;
  if (!pnpmVersionRange) throw new Error('`engines.pnpm` field is not defined');
  if (typeof pnpmVersionRange !== 'string') throw new Error('`engines.pnpm` field is not string value');

  console.log(`Detect pnpm version: ${pnpmVersionRange}`);
  setOutput('pnpm-version-range', pnpmVersionRange || '');
}

try {
  main();
} catch (error) {
  process.exitCode = 1;
  console.error(error.message);
}
