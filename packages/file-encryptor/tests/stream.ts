import { streamToBuffer } from '@jorgeferrero/stream-to-buffer';

import { decryptStream, encrypt, encryptStream } from '../src';
import { createChunkerStream, createCountStream, createStreamFromBuffer } from './helpers/stream';

describe('encryptStream()', () => {
    it('single chunk', async () => {
        const stream = createCountStream(1).pipe(encryptStream(''));
        const chunkList: Buffer[] = [];
        for await (const chunk of stream) {
            chunkList.push(chunk);
        }
        expect(chunkList).toHaveLength(1);
    });
    it('multi chunk', async () => {
        const stream = createCountStream(4).pipe(encryptStream(''));
        const chunkList: Buffer[] = [];
        for await (const chunk of stream) {
            chunkList.push(chunk);
        }
        expect(chunkList).toHaveLength(4);
    });
    it('subsequent chunks are smaller than the first chunk', async () => {
        let firstChunkLen: number | undefined;
        const stream = createCountStream(4).pipe(encryptStream(''));
        for await (const chunk of stream) {
            // eslint-disable-next-line jest/no-if
            if (typeof firstChunkLen === 'number') {
                // eslint-disable-next-line jest/no-conditional-expect
                expect(chunk.byteLength).toBeLessThan(firstChunkLen);
            } else {
                firstChunkLen = chunk.byteLength;
            }
        }
    });
});

describe('decryptStream()', () => {
    const cleartext = Buffer.from('123456789');
    const password = 'HK6715263GHA';

    describe('can decrypt', () => {
        it('full data', async () => {
            const encryptedData = await encrypt(cleartext, password);
            const decryptedData = await streamToBuffer(
                createStreamFromBuffer(encryptedData)
                    .pipe(decryptStream(password)),
            );
            expect(decryptedData).toStrictEqual(cleartext);
        });
        it('full data [torn]', async () => {
            const encryptedData = await encrypt(cleartext, password);
            const decryptedData = await streamToBuffer(
                createStreamFromBuffer(encryptedData, 2)
                    .pipe(decryptStream(password)),
            );
            expect(decryptedData).toStrictEqual(cleartext);
        });
        it('single chunk', async () => {
            const decryptedData = await streamToBuffer(
                createStreamFromBuffer(cleartext)
                    .pipe(encryptStream(password))
                    .pipe(decryptStream(password)),
            );
            expect(decryptedData).toStrictEqual(cleartext);
        });
        it('single chunk [torn]', async () => {
            const decryptedData = await streamToBuffer(
                createStreamFromBuffer(cleartext)
                    .pipe(encryptStream(password))
                    .pipe(createChunkerStream({ chunkSize: 2 }))
                    .pipe(decryptStream(password)),
            );
            expect(decryptedData).toStrictEqual(cleartext);
        });
        it('multi chunk', async () => {
            const decryptedData = await streamToBuffer(
                createStreamFromBuffer(cleartext, 2)
                    .pipe(encryptStream(password))
                    .pipe(decryptStream(password)),
            );
            expect(decryptedData).toStrictEqual(cleartext);
        });
        it('multi chunk [torn]', async () => {
            const decryptedData = await streamToBuffer(
                createStreamFromBuffer(cleartext, 2)
                    .pipe(encryptStream(password))
                    .pipe(createChunkerStream({ chunkSize: 2 }))
                    .pipe(decryptStream(password)),
            );
            expect(decryptedData).toStrictEqual(cleartext);
        });
    });
});
