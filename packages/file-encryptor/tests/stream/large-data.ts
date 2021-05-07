import * as crypto from 'crypto';

import { decryptStream, encryptStream } from '../../src';
import { createFillBytesReadableStream, pipelineAsync } from '../helpers/stream';

const password = '1234';

describe('encryptStream()', () => {
    it('transform large data', async () => {
        const dataSize = 500 * 2 ** 20; // 500 MiB
        const inputHash = crypto.createHash('sha1');
        const outputHash = crypto.createHash('sha1');
        const inputStream = createFillBytesReadableStream({ size: dataSize });

        const startMem = process.memoryUsage().rss;
        await Promise.all([
            pipelineAsync(
                inputStream,
                encryptStream(password, {
                    algorithm: 'aes-256-gcm',
                }),
                decryptStream(password),
                outputHash,
            ),
            pipelineAsync(
                inputStream,
                inputHash,
            ),
        ]);
        const endMem = process.memoryUsage().rss;

        /**
         * If Encryptor is using the Stream API correctly,
         * the amount of memory used will be less than the input data length
         * even when converting huge data.
         */
        expect(endMem - startMem).toBeLessThan(dataSize);

        const inputSHA1 = inputHash.digest('hex');
        const outputSha1 = outputHash.digest('hex');
        expect(outputSha1).toStrictEqual(inputSHA1);
    }, 10 * 60 * 1000);
});
