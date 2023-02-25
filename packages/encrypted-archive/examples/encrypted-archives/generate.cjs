// @ts-check
/* eslint node/no-unsupported-features/node-builtins:
            ["error", {version: ">=12.17"}]
          n/no-unsupported-features/node-builtins:
            ["error", {version: ">=12.17"}] */

const { promises: fsAsync } = require('fs');
const path = require('path');
const util = require('util');

const { encryptIterator } = require('@sounisi5011/encrypted-archive');
const { version: encryptedArchiveVersion } = require('@sounisi5011/encrypted-archive/package.json');

/**
 * @typedef {import("@sounisi5011/encrypted-archive").EncryptOptions} EncryptOptions
 * @typedef {import("@sounisi5011/encrypted-archive").CompressOptions} CompressOptions
 */

(async () => {
  const outputDirpath = path.resolve(__dirname, `v${encryptedArchiveVersion}`);
  await fsAsync.mkdir(outputDirpath)
    .catch(error => {
      if (error.code !== 'EEXIST') throw error;
    });

  const plaintextFilepath = path.resolve(__dirname, 'plaintext.txt');
  const plaintext = await fsAsync.readFile(plaintextFilepath);
  const plaintextChunks = [...(function*() {
    const chunkSize = 173;
    let pos = 0;
    while (pos < plaintext.length) {
      yield plaintext.subarray(pos, pos += chunkSize);
    }
  })()];
  const password = await fsAsync.readFile(path.resolve(__dirname, 'password.txt'));

  /** @type {Array<EncryptOptions['algorithm']>} */
  const encryptAlgorithmList = ['aes-256-gcm', 'chacha20-poly1305'];
  /** @type {Array<EncryptOptions['keyDerivation']['algorithm']>} */
  const keyDerivationAlgorithmList = ['argon2d', 'argon2id'];
  /** @type {Array<CompressOptions['algorithm'] | undefined>} */
  const compressAlgorithmList = [undefined, 'gzip', 'brotli'];
  const inputChunkTypeRecord = {
    single: [plaintext],
    multi: plaintextChunks,
  };

  for (const encryptAlgorithm of encryptAlgorithmList) {
    for (const keyDerivationAlgorithm of keyDerivationAlgorithmList) {
      for (const compressAlgorithm of compressAlgorithmList) {
        const encryptor = encryptIterator(password, {
          algorithm: encryptAlgorithm,
          keyDerivation: {
            algorithm: keyDerivationAlgorithm,
          },
          compress: compressAlgorithm,
        });
        for (const [inputChunkType, plaintextChunks] of Object.entries(inputChunkTypeRecord)) {
          const outputFilename = [
            `algorithm=${encryptAlgorithm || 'default'}`,
            `keyDerivation=${keyDerivationAlgorithm || 'default'}`,
            `compress=${compressAlgorithm || 'none'}`,
            `input=${inputChunkType}-chunk`,
            'dat',
          ].join('.');
          await fsAsync.writeFile(
            path.resolve(outputDirpath, outputFilename),
            encryptor(plaintextChunks),
            { mode: 0o444, flag: 'wx' },
          );
        }
      }
    }
  }
})().catch(error => {
  process.exitCode = 1;
  process.stderr.write(util.inspect(error) + '\n');
});
