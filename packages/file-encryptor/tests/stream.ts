import * as stream from 'stream';

import { streamToBuffer } from '@jorgeferrero/stream-to-buffer';
import { writableNoopStream } from 'noop-stream';

import { decryptStream, encrypt, encryptStream } from '../src';
import './helpers/jest-matchers';
import { createChunkerStream, createCountStream, createStreamFromBuffer, pipelineAsync } from './helpers/stream';

const chunkTypeErrorMessageRegExp =
    /^Invalid type chunk received\. Each chunk must be of type string or an instance of Buffer, TypedArray, DataView, or ArrayBuffer\. Received\b/;

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
        const chunkCount = 4;
        let firstChunkLen: number | undefined;
        const stream = createCountStream(chunkCount).pipe(encryptStream(''));

        expect.assertions(chunkCount - 1);
        for await (const chunk of stream) {
            // eslint-disable-next-line jest/no-if
            if (typeof firstChunkLen === 'number') {
                // eslint-disable-next-line jest/no-conditional-expect
                expect(chunk.byteLength).toBeLessThanByteSize(firstChunkLen);
            } else {
                firstChunkLen = chunk.byteLength;
            }
        }
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
            await expect(pipelineAsync(
                // eslint-disable-next-line node/no-unsupported-features/node-builtins
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
                // eslint-disable-next-line node/no-unsupported-features/node-builtins
                stream.Readable.from([chunk]),
                encryptStream(''),
                writableNoopStream(),
            );
            await expect(resultPromise).rejects.toThrowWithMessageFixed(
                TypeError,
                chunkTypeErrorMessageRegExp,
            );
        });
    });
    /**
     * Note: The Transform stream emits an `error` event followed by a `close` event when an error occurs.
     *       However, the `duplexify@4.1.1` package will emit a `finish` event before the `error` event.
     *       Because of this, errors emitted from the encryptor are not received by the `stream.pipeline()` module method.
     *       This problem can be solved by using the `pipe()` method or the `stream.pipeline()` module method to attach the Writable stream to the decryptor.
     *       In most cases, the encryptor stream is connected to the Writable stream for use.
     *       Therefore, it should not affect most users.
     *       However, there may be other bugs that cause errors emitted by the encryptor to be ignored.
     *       Conclusion: This bug has to be fixed.
     * TODO: Fork the `duplexify` package or stop using it to fix this bug.
     */
    it.skip('encryptor should throw an error even if not piped to WritableStream', async () => {
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
        )).rejects.toThrow(new Error(`error!!!!!`));

        await expect(pipelineAsync(
            stream.Readable.from([42]),
            encryptStream(''),
        )).rejects.toThrow(chunkTypeErrorMessageRegExp);
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
                // eslint-disable-next-line node/no-unsupported-features/node-builtins
                stream.Readable.from([chunk]),
                decryptStream(''),
                writableNoopStream(),
            );
            await expect(resultPromise).rejects.toThrow(/^Invalid identifier detected\./);
        });
        it.each<[string, unknown]>([
            ['number', 42],
            ['object', { hoge: 'fuga' }],
        ])('%s', async (_, chunk) => {
            const resultPromise = pipelineAsync(
                // eslint-disable-next-line node/no-unsupported-features/node-builtins
                stream.Readable.from([chunk]),
                decryptStream(''),
                writableNoopStream(),
            );
            await expect(resultPromise).rejects.toThrowWithMessageFixed(
                TypeError,
                chunkTypeErrorMessageRegExp,
            );
        });
    });
    /**
     * Note: The Transform stream emits an `error` event followed by a `close` event when an error occurs.
     *       However, the `duplexify@4.1.1` package will emit a `finish` event before the `error` event.
     *       Because of this, errors emitted from the decryptor are not received by the `stream.pipeline()` module method.
     *       This problem can be solved by using the `pipe()` method or the `stream.pipeline()` module method to attach the Writable stream to the decryptor.
     *       In most cases, the decryptor stream is connected to the Writable stream for use.
     *       Therefore, it should not affect most users.
     *       However, there may be other bugs that cause errors emitted by the decryptor to be ignored.
     *       Conclusion: This bug has to be fixed.
     * TODO: Fork the `duplexify` package or stop using it to fix this bug.
     */
    it.skip('decryptor should throw an error even if not piped to WritableStream', async () => {
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
        )).rejects.toThrow(new Error(`error!!!!!`));

        await expect(pipelineAsync(
            createCountStream(1),
            decryptStream(''),
        )).rejects.toThrow(/^Invalid identifier detected\./);
    });
});
