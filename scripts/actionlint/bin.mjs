#!/usr/bin/env node
// @ts-check

/* eslint-disable node/no-missing-import, import/no-unresolved */

import * as actionsCache from '@actions/cache';
import { awaitMainFn } from '@sounisi5011/cli-utils-top-level-await';
import crossSpawn from 'cross-spawn';
import fetch from 'node-fetch';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as stream from 'node:stream';
import * as util from 'node:util';

import { dirname as dirpath } from './dirname.js';

const CACHE_KEY = `actionlint-${os.platform()}-${os.arch()}`;
/**
 * @see https://github.com/rhysd/actionlint/blob/v1.6.7/docs/install.md#download-script
 */
const DOWNLOAD_SCRIPT_URL = 'https://raw.githubusercontent.com/rhysd/actionlint/main/scripts/download-actionlint.bash';

const isWin = os.platform() === 'win32';
const exePath = path.join(dirpath, isWin ? 'actionlint.exe' : 'actionlint');

/**
 * @param url {string}
 * @param destPath {string}
 */
async function download(url, destPath) {
  const response = await fetch(url);
  const destFileStream = fs.createWriteStream(destPath);
  await util.promisify(stream.pipeline)(response.body, destFileStream);
}

async function install() {
  const downloadScriptFilepath = path.join(dirpath, 'download-actionlint.bash');

  console.warn('Downloading "download-actionlint.bash"...');
  await download(DOWNLOAD_SCRIPT_URL, downloadScriptFilepath);

  console.warn('-----\nInstalling actionlint...');
  const result = crossSpawn.sync('bash', [downloadScriptFilepath], { cwd: dirpath, stdio: 'inherit' });
  if (result.error) {
    process.exitCode = typeof result.status !== 'number' ? 1 : result.status;
    throw result.error;
  } else {
    process.exitCode = typeof result.status !== 'number' ? 0 : result.status;
  }
  console.warn('-----');
}

async function restoreFromCache() {
  console.warn('Restoring from cache...');
  const cacheKey = await actionsCache.restoreCache([exePath], CACHE_KEY);

  if (cacheKey) {
    console.warn(`Cache restored from key: ${cacheKey}`);
  } else {
    console.warn(`Cache not found for key: ${CACHE_KEY}`);
  }
  console.warn('-----');
}

async function saveToCache() {
  console.warn('-----\nSave to cache...');
  await actionsCache.saveCache([exePath], CACHE_KEY);
  console.warn(`Cache saved with key: ${CACHE_KEY}`);
}

/**
 * @param args {string[]}
 */
function execActionlint(args) {
  const result = crossSpawn.sync(
    exePath,
    args,
    { stdio: 'inherit' },
  );
  if (result.error) {
    process.exitCode = typeof result.status !== 'number' ? 1 : result.status;
    throw result.error;
  } else {
    process.exitCode = typeof result.status !== 'number' ? 0 : result.status;
  }
}

awaitMainFn(async () => {
  const args = process.argv.slice(2);
  const isUseActionsCache = 'GITHUB_ACTIONS' in process.env;

  if (isUseActionsCache) {
    await restoreFromCache();
  }

  try {
    execActionlint(args);
  } catch (error) {
    if (!(error instanceof Error && error.code === 'ENOENT')) {
      throw error;
    }

    await install();

    execActionlint(args);
  }

  if (isUseActionsCache) {
    await saveToCache();
  }
});
