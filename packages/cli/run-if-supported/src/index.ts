#!/usr/bin/env node

import { awaitMainFn } from '@sounisi5011/cli-utils-top-level-await';
import { argv, cwd as getCwd, versions } from 'process';

import { main } from './main';
import { spawnAsync } from './spawn';

void awaitMainFn(main({
    cwd: getCwd(),
    entryFilepath: __filename,
    argv: argv.slice(2),
    nodeVersion: versions.node,
    spawnAsync,
}));
