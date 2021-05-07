import * as crypto from 'crypto';

import { decryptStream, encryptStream } from '../../src';
import { createFillBytesReadableStream, pipelineAsync } from '../helpers/stream';

const password = '1234';

describe('encryptStream()', () => {
    /**
     * If not implemented with proper streaming handling, this test should fail.
     * This is because 3 GiB is more than the amount of data that can be handled by a single Buffer instance.
     * @see https://nodejs.org/api/buffer.html#buffer_buffer_constants_max_length
     */
    it('transform 3GiB data', async () => {
        const threeGiB = 3 * 2 ** 30;
        const inputHash = crypto.createHash('sha1');
        const outputHash = crypto.createHash('sha1');
        const inputStream = createFillBytesReadableStream({ size: threeGiB });

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

        const inputSHA1 = inputHash.digest('hex');
        const outputSha1 = outputHash.digest('hex');
        expect(outputSha1).toStrictEqual(inputSHA1);
    }, 10 * 60 * 1000);
});
