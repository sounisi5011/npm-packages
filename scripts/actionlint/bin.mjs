#!/usr/bin/env node
// @ts-check

/* eslint-disable node/no-missing-import, import/no-unresolved */

import { awaitMainFn } from '@sounisi5011/cli-utils-top-level-await';
import crossSpawn from 'cross-spawn';
import fetch from 'node-fetch';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as stream from 'node:stream';
import * as util from 'node:util';

import { dirname as dirpath } from './dirname.js';

/**
 * @see https://github.com/rhysd/actionlint/blob/v1.6.7/docs/install.md#download-script
 */
const DOWNLOAD_SCRIPT_URL = 'https://raw.githubusercontent.com/rhysd/actionlint/main/scripts/download-actionlint.bash';
const MAX_AGE_SEC = 24 * 60 * 60;

const isWin = os.platform() === 'win32';
const exePath = path.join(dirpath, isWin ? 'actionlint.exe' : 'actionlint');

/**
 * @param stats {fs.Stats}
 * @returns {boolean}
 */
function isExecutable(stats) {
  return Boolean(stats.mode & fs.constants.S_IXUSR);
}

/**
 * @param url {string}
 * @param destPath {string}
 * @returns {Promise<{cache: boolean}>}
 */
async function download(url, destPath) {
  const cacheMetadataPath = `${destPath}.http-cache-metadata.json`;
  const cacheMetadata = await fs.promises.readFile(cacheMetadataPath, 'utf8')
    .then(JSON.parse)
    .catch(() => ({}));
  /** @type {string|null} */
  const etag = typeof cacheMetadata.etag === 'string' ? cacheMetadata.etag : '';
  const useConditionalRequest = /^(?:W\/)?".+"$/s.test(etag) && fs.existsSync(destPath);

  /** @type {import('node-fetch').RequestInit} */
  const requestInit = {
    headers: useConditionalRequest
      ? {
        'If-None-Match': etag,
      }
      : {},
  };
  const response = await fetch(url, requestInit);
  const newCacheMetadata = {
    etag: response.headers.get('Etag'),
    lastModified: response.headers.get('Last-Modified'),
  };

  if (useConditionalRequest && response.status === 304) {
    return { cache: true };
  }

  const destFileStream = fs.createWriteStream(destPath);
  await util.promisify(stream.pipeline)(response.body, destFileStream);
  await fs.promises.writeFile(cacheMetadataPath, JSON.stringify(newCacheMetadata))
    .catch(() => {});

  return { cache: false };
}

async function install() {
  const downloadScriptFilepath = path.join(dirpath, 'download-actionlint.bash');

  console.warn('Downloading "download-actionlint.bash"...');
  const { cache } = await download(DOWNLOAD_SCRIPT_URL, downloadScriptFilepath);
  if (cache) {
    console.warn('"download-actionlint.bash" is not modified');
  }
  console.warn('-----');

  /** @type {fs.Stats|false} */
  let exeStats;
  if (
    cache
    && (exeStats = await fs.promises.stat(exePath).catch(() => false))
    && exeStats.isFile()
    && isExecutable(exeStats)
  ) {
    console.warn('actionlint already installed');
    // Update ctime
    await fs.promises.chmod(exePath, exeStats.mode)
      .catch(() => {});
  } else {
    console.warn('Installing actionlint...');
    const result = crossSpawn.sync('bash', [downloadScriptFilepath], { cwd: dirpath, stdio: 'inherit' });
    if (result.error) {
      process.exitCode = typeof result.status !== 'number' ? 1 : result.status;
      throw result.error;
    } else {
      process.exitCode = typeof result.status !== 'number' ? 0 : result.status;
    }
  }

  console.warn('-----');
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

  if (
    await fs.promises.stat(exePath)
      .then(exeStats =>
        // If exec file is not a regular file, reinstall actionlint
        !exeStats.isFile()
        // If exec file is not executable, reinstall actionlint
        || !isExecutable(exeStats)
        // If exec file is outdated, reinstall actionlint
        || (MAX_AGE_SEC * 1000) < (Date.now() - Math.max(exeStats.birthtimeMs, exeStats.mtimeMs, exeStats.ctimeMs))
      )
      // If exec file does not exist, install actionlint
      .catch(() => true)
  ) {
    await install();
  }

  execActionlint(args);
});
