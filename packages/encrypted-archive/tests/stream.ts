import * as stream from 'stream';

import { writableNoopStream } from 'noop-stream';

import { decryptStream, encrypt, encryptStream } from '../src';
import { genInputTypeCases } from './helpers';
import { createChunkerStream, createCountStream, createStreamFromBuffer, pipelineAsync } from './helpers/stream';

const chunkTypeErrorMessageRegExp =
    /^Invalid type chunk received\. Each chunk must be of type string or an instance of Buffer, TypedArray, DataView, or ArrayBuffer\. Received\b/;

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
    describe('non Buffer chunk', () => {
        const cases = genInputTypeCases('foo bar.').filter(([, chunk]) => !Buffer.isBuffer(chunk));
        it.each(cases)('%s', async (_, chunk) => {
            await expect(pipelineAsync(
                stream.Readable.from([chunk]),
                encryptStream(''),
                writableNoopStream(),
            )).toResolve();
        });
        it.each<[string, unknown]>([
            ['number', 42],
            ['object', { hoge: 'fuga' }],
        ])('%s', async (_, chunk) => {
            const resultPromise = pipelineAsync(
                stream.Readable.from([chunk]),
                encryptStream(''),
                writableNoopStream(),
            );
            await expect(resultPromise).rejects.toThrowWithMessage(
                TypeError,
                chunkTypeErrorMessageRegExp,
            );
        });
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
        )).rejects.toThrowWithMessage(Error, chunkTypeErrorMessageRegExp);
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
    describe('non Buffer chunk', () => {
        it.each<[string, string | ArrayBufferLike | NodeJS.ArrayBufferView]>([
            ['string', 'foo'],
            // TypedArray
            ['Uint8Array', new Uint8Array(3)],
            ['Uint8ClampedArray', new Uint8ClampedArray(2)],
            ['Uint16Array', new Uint16Array(1)],
            ['Uint32Array', new Uint32Array(6)],
            ['Int8Array', new Int8Array(4)],
            ['Int16Array', new Int16Array(9)],
            ['Int32Array', new Int32Array(7)],
            ['BigUint64Array', new BigUint64Array(5)],
            ['BigInt64Array', new BigInt64Array(8)],
            ['Float32Array', new Float32Array(1)],
            ['Float64Array', new Float64Array(1)],
            // DataView
            ['DataView', new DataView(new ArrayBuffer(3))],
            // ArrayBufferLike
            ['ArrayBuffer', new ArrayBuffer(5)],
            ['SharedArrayBuffer', new SharedArrayBuffer(5)],
        ])('%s', async (_, chunk) => {
            const resultPromise = pipelineAsync(
                stream.Readable.from([chunk]),
                decryptStream(''),
                writableNoopStream(),
            );
            await expect(resultPromise).rejects.toThrowWithMessage(Error, /^Invalid identifier detected\./);
        });
        it.each<[string, unknown]>([
            ['number', 42],
            ['object', { hoge: 'fuga' }],
        ])('%s', async (_, chunk) => {
            const resultPromise = pipelineAsync(
                stream.Readable.from([chunk]),
                decryptStream(''),
                writableNoopStream(),
            );
            await expect(resultPromise).rejects.toThrowWithMessage(
                TypeError,
                chunkTypeErrorMessageRegExp,
            );
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
