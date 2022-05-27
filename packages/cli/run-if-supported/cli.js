#!/usr/bin/env node
// @ts-check

const process = require('process');

const { awaitMainFn } = require('@sounisi5011/cli-utils-top-level-await');

const { main } = require('./dist/main');
const { spawnAsync } = require('./dist/spawn');

awaitMainFn(main({
  cwd: process.cwd(),
  entryFilepath: __filename,
  argv: process.argv.slice(2),
  nodeVersion: process.versions.node,
  spawnAsync,
}));
