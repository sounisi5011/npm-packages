import * as stream from 'stream';
import { promisify } from 'util';

import { writableNoopStream } from 'noop-stream';
import randomBytesReadableStream from 'random-bytes-readable-stream';

import { encryptStream } from '../../src';

const waitStreamFinished = promisify(stream.finished);

const password = '1234';

describe('encryptStream()', () => {
    /**
     * If not implemented with proper streaming handling, this test should fail.
     * This is because 3 GiB is more than the amount of data that can be handled by a single Buffer instance.
     * @see https://nodejs.org/api/buffer.html#buffer_buffer_constants_max_length
     */
    it('transform 3GiB data', async () => {
        const threeGiB = 3 * 2 ** 30;
        const stream = randomBytesReadableStream({ size: threeGiB })
            .pipe(encryptStream(password))
            .pipe(writableNoopStream());
        await expect(waitStreamFinished(stream)).toResolve();
    }, 10 * 60 * 1000);
});
