import * as crypto from 'crypto';
import * as path from 'path';

import execa from 'execa';

import { createFillBytesReadableStream, pipelineAsync } from '../helpers/stream';

const PACKAGE_ROOT = path.resolve(__dirname, '../..');

describe('encryptStream()', () => {
    beforeAll(async () => {
        await execa('pnpm', ['run', 'build:src'], { cwd: PACKAGE_ROOT });
    }, 60 * 1000);

    it('transform large data', async () => {
        const dataSize = 500 * 2 ** 20; // 500 MiB
        const inputHash = crypto.createHash('sha1');
        const inputStream = createFillBytesReadableStream({ size: dataSize });

        const subprocessPath = path.resolve(__dirname, 'encrypt-and-decrypt-then-generate-sha1.cjs');
        const subprocess = execa('node', [subprocessPath], { input: inputStream });

        await Promise.all([
            subprocess,
            pipelineAsync(
                inputStream,
                inputHash,
            ),
        ]);
        const subprocessResult = JSON.parse((await subprocess).stdout);

        /**
         * If Encryptor is using the Stream API correctly,
         * the amount of memory used will be less than the input data length
         * even when converting huge data.
         */
        const expectedMaxMemoryUsage = dataSize / 2;
        expect(subprocessResult.maxMemoryUsage.rss).toBeLessThanByteSize(expectedMaxMemoryUsage);
        expect(subprocessResult.maxMemoryUsage.heapTotal).toBeLessThanByteSize(expectedMaxMemoryUsage);
        expect(subprocessResult.maxMemoryUsage.heapUsed).toBeLessThanByteSize(expectedMaxMemoryUsage);
        expect(subprocessResult.maxMemoryUsage.external).toBeLessThanByteSize(expectedMaxMemoryUsage);
        expect(subprocessResult.maxMemoryUsage.arrayBuffers).toBeLessThanByteSize(expectedMaxMemoryUsage);

        const inputSHA1 = inputHash.digest('hex');
        const outputSha1 = subprocessResult.sha1;
        expect(outputSha1).toStrictEqual(inputSHA1);
    }, 10 * 60 * 1000);
});
