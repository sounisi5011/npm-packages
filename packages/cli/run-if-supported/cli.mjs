#!/usr/bin/env node
// @ts-check

import * as process from 'node:process';
import * as url from 'node:url';

import { awaitMainFn } from '@sounisi5011/cli-utils-top-level-await';

import { main } from './dist/main.mjs';
import { spawnAsync } from './dist/spawn.mjs';

awaitMainFn(main({
  cwd: process.cwd(),
  entryFilepath: url.fileURLToPath(import.meta.url),
  argv: process.argv.slice(2),
  nodeVersion: process.versions.node,
  spawnAsync,
}));
