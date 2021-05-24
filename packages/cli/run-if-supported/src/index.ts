#!/usr/bin/env node

import { argv, cwd as getCwd, versions } from 'process';

import { main } from './main';
import { spawnAsync } from './spawn';

main({
    cwd: getCwd(),
    entryFilepath: __filename,
    argv: argv.slice(2),
    nodeVersion: versions.node,
    spawnAsync,
}).catch(error => {
    process.exitCode = 1;
    console.error(error);
});
