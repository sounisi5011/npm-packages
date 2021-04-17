#!/usr/bin/env node
// @ts-check

const path = require('path');

const spawn = require('cross-spawn');
const semver = require('semver');

/**
 * @param {string} command
 * @param {readonly string[]} args
 * @param {import('child_process').SpawnOptions} options
 * @returns {Promise<void>}
 */
async function spawnAsync(command, args, options) {
  const child = spawn(command, args, options);
  return new Promise(resolve => {
    child.on('close', exitCode => {
      process.exitCode = exitCode;
      resolve();
    });
  });
}

async function main() {
  const nodeVersion = process.versions.node;
  const [, , subCommand, ...subCommandArgs] = process.argv;

  const pkgJsonPath = path.resolve('package.json');
  const pkg = require(pkgJsonPath);
  const supportedNodeVersionRange = pkg && pkg.engines && pkg.engines.node;

  if (typeof supportedNodeVersionRange === 'string' && !semver.satisfies(nodeVersion, supportedNodeVersionRange)) {
    console.error(
      `skipped command execution. node ${nodeVersion} is not included in supported range: ${supportedNodeVersionRange}`,
    );
    return;
  }

  await spawnAsync(subCommand, subCommandArgs, { stdio: 'inherit' });
}

(async () => {
  try {
    await main();
  } catch (error) {
    process.exitCode = 1;
    console.dir(error);
  }
})();
