// @ts-check

const { createHash } = require('crypto');
const { pipeline } = require('stream');

const { decryptStream, encryptStream } = require('../..');

const password = '1234';
const outputHash = createHash('sha1');

const maxMemoryUsage = process.memoryUsage();

/** @type {ReturnType<setImmediate>} */
let timerID;
(function monitorMem() {
  const memoryUsage = process.memoryUsage();
  maxMemoryUsage.rss = Math.max(maxMemoryUsage.rss, memoryUsage.rss);
  maxMemoryUsage.heapTotal = Math.max(maxMemoryUsage.heapTotal, memoryUsage.heapTotal);
  maxMemoryUsage.heapUsed = Math.max(maxMemoryUsage.heapUsed, memoryUsage.heapUsed);
  maxMemoryUsage.external = Math.max(maxMemoryUsage.external, memoryUsage.external);
  // @ts-expect-error TS2339: Property 'arrayBuffers' does not exist on type 'MemoryUsage'.
  maxMemoryUsage.arrayBuffers = Math.max(maxMemoryUsage.arrayBuffers, memoryUsage.arrayBuffers);

  timerID = setImmediate(monitorMem);
})();

pipeline(
  process.stdin,
  encryptStream(password, {
    algorithm: 'aes-256-gcm',
  }),
  decryptStream(password),
  outputHash,
  err => {
    clearImmediate(timerID);

    if (err) throw err;
    console.log(JSON.stringify({
      maxMemoryUsage,
      sha1: outputHash.digest('hex'),
    }));
  },
);
