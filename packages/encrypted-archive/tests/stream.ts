import * as stream from 'stream';

import { decryptStream, encrypt, encryptStream } from '../src';
import { createChunkerStream, createCountStream, createStreamFromBuffer, pipelineAsync } from './helpers/stream';

describe('encryptStream()', () => {
    it.each<[string, number]>([
        ['single chunk', 1],
        ['multi chunk', 4],
    ])('%s', async (_, chunkCount) => {
        const stream = createCountStream(chunkCount).pipe(encryptStream(''));
        const chunkList: Buffer[] = [];
        for await (const chunk of stream) {
            expect(chunk).toBeInstanceOf(Buffer);
            chunkList.push(chunk);
        }
        expect(chunkList).toHaveLength(chunkCount);
    });
    it('subsequent chunks are smaller than the first chunk', async () => {
        const chunkCount = 4;
        let firstChunkLen: number | undefined;
        const stream = createCountStream(chunkCount).pipe(encryptStream(''));

        expect.assertions(chunkCount - 1);
        for await (const chunk of stream) {
            if (typeof firstChunkLen === 'number') {
                // eslint-disable-next-line jest/no-conditional-expect
                expect(chunk).toBeLessThanByteSize(firstChunkLen);
            } else {
                firstChunkLen = chunk.byteLength;
            }
        }
    });
    it('encryptor should throw an error even if not piped to WritableStream', async () => {
        /**
         * In the case of Transform streams, errors can be detected even if they are not attached to a Writable stream.
         */
        await expect(pipelineAsync(
            createCountStream(1),
            new stream.Transform({
                transform(_c, _e, done) {
                    done(new Error(`error!!!!!`));
                },
            }),
        )).rejects.toThrowWithMessage(Error, `error!!!!!`);

        await expect(pipelineAsync(
            stream.Readable.from([42]),
            encryptStream(''),
        )).rejects.toThrowWithMessage(Error, /^Invalid type chunk received\./);
    });
});

describe('decryptStream()', () => {
    const cleartext = Buffer.from('123456789');
    const password = 'HK6715263GHA';

    describe('can decrypt', () => {
        it.each<[string, NodeJS.ReadableStream | (() => Promise<NodeJS.ReadableStream>)]>([
            [
                'full data',
                async () => {
                    const encryptedData = await encrypt(cleartext, password);
                    return createStreamFromBuffer(encryptedData);
                },
            ],
            [
                'full data [torn]',
                async () => {
                    const encryptedData = await encrypt(cleartext, password);
                    return createStreamFromBuffer(encryptedData, 2);
                },
            ],
            [
                'single chunk',
                createStreamFromBuffer(cleartext)
                    .pipe(encryptStream(password)),
            ],
            [
                'single chunk [torn]',
                createStreamFromBuffer(cleartext)
                    .pipe(encryptStream(password))
                    .pipe(createChunkerStream({ chunkSize: 2 })),
            ],
            [
                'multi chunk',
                createStreamFromBuffer(cleartext, 2)
                    .pipe(encryptStream(password)),
            ],
            [
                'multi chunk [torn]',
                createStreamFromBuffer(cleartext, 2)
                    .pipe(encryptStream(password))
                    .pipe(createChunkerStream({ chunkSize: 2 })),
            ],
        ])('%s', async (_, createInputStream) => {
            const inputStream = typeof createInputStream === 'function'
                ? await createInputStream()
                : createInputStream;
            const stream = inputStream.pipe(decryptStream(password));

            const chunkList: Buffer[] = [];
            for await (const chunk of stream) {
                expect(chunk).toBeInstanceOf(Buffer);
                chunkList.push(chunk);
            }

            const decryptedData = Buffer.concat(chunkList);
            expect(decryptedData).toBytesEqual(cleartext);
        });
    });
    it('decryptor should throw an error even if not piped to WritableStream', async () => {
        /**
         * In the case of Transform streams, errors can be detected even if they are not attached to a Writable stream.
         */
        await expect(pipelineAsync(
            createCountStream(1),
            new stream.Transform({
                transform(_c, _e, done) {
                    done(new Error(`error!!!!!`));
                },
            }),
        )).rejects.toThrowWithMessage(Error, `error!!!!!`);

        await expect(pipelineAsync(
            createCountStream(1),
            decryptStream(''),
        )).rejects.toThrowWithMessage(Error, /^Invalid identifier detected\./);
    });
});
