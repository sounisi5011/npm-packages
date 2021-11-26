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

const isWin = os.platform() === 'win32';
const exePath = path.join(dirpath, isWin ? 'actionlint.exe' : 'actionlint');

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

  if (
    cache
    && await fs.promises.stat(exePath)
      .then(stats => stats.isFile() && (stats.mode & fs.constants.S_IXUSR))
      .catch(() => false)
  ) {
    console.warn('actionlint already installed');
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

  try {
    execActionlint(args);
  } catch (error) {
    if (!(error instanceof Error && error.code === 'ENOENT')) {
      throw error;
    }

    await install();

    execActionlint(args);
  }
});
