import * as stream from 'stream';

import { streamToBuffer } from '@jorgeferrero/stream-to-buffer';

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
        let firstChunkLen: number | undefined;
        const stream = createCountStream(4).pipe(encryptStream(''));
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
            );
            await expect(resultPromise).rejects.toThrow(TypeError);
            await expect(resultPromise).rejects.toThrow(chunkTypeErrorMessageRegExp);
        });
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
            );
            await expect(resultPromise).rejects.toThrow(TypeError);
            await expect(resultPromise).rejects.toThrow(chunkTypeErrorMessageRegExp);
        });
    });
});
