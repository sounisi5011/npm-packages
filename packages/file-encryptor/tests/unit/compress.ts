import * as zlib from 'zlib';

import { compress, CompressAlgorithmName, decompressIterable } from '../../src/compress';
import { iterable2buffer } from '../helpers';
import { optGen } from '../helpers/combinations';
import '../helpers/jest-matchers';

describe('compress()', () => {
    describe('compress data', () => {
        const data = Buffer.from('Hello World!'.repeat(20));

        it('gzip (string options)', async () => {
            const { data: compressedData } = await compress(data, 'gzip');
            expect(compressedData.byteLength).toBeLessThanByteSize(data.byteLength);
        });

        it('gzip (object options)', async () => {
            const { data: compressedData } = await compress(data, { algorithm: 'gzip' });
            expect(compressedData.byteLength).toBeLessThanByteSize(data.byteLength);
        });

        it('brotli (string options)', async () => {
            const { data: compressedData } = await compress(data, 'brotli');
            expect(compressedData.byteLength).toBeLessThanByteSize(data.byteLength);
        });

        it('brotli (object options)', async () => {
            const { data: compressedData } = await compress(data, { algorithm: 'brotli' });
            expect(compressedData.byteLength).toBeLessThanByteSize(data.byteLength);
        });
    });

    it('unknown algorithm', async () => {
        const algorithm = 'foooooooooooooo';

        // @ts-expect-error TS2345: Argument of type '"foooooooooooooo"' is not assignable to parameter of type 'CompressOptionsWithString'.
        await expect(compress('', algorithm)).rejects.toThrowWithMessageFixed(
            TypeError,
            `Unknown compress algorithm was received: ${algorithm}`,
        );
    });

    describe('not allowed options', () => {
        it.each<[string, zlib.ZlibOptions]>([
            ['info=true', { info: true }],
            ['info=false', { info: false }],
            ['info=undefined', { info: undefined }],
        ])('%s', async (_, options) => {
            await expect(compress('', { ...options, algorithm: 'gzip' })).rejects.toThrowWithMessageFixed(
                Error,
                `The following compress options are not allowed: info`,
            );
        });
        it.each<[string, zlib.ZlibOptions]>([
            ['flush=Z_FINISH', { flush: zlib.constants.Z_FINISH }],
            ['flush=0', { flush: 0 }],
            ['flush=undefined', { flush: undefined }],
        ])('%s', async (_, options) => {
            await expect(compress('', { ...options, algorithm: 'gzip' })).rejects.toThrowWithMessageFixed(
                Error,
                `The following compress options are not allowed: flush`,
            );
        });
        it.each<[string, zlib.ZlibOptions]>([
            ['finishFlush=Z_BLOCK', { finishFlush: zlib.constants.Z_BLOCK }],
            ['finishFlush=0', { finishFlush: 0 }],
            ['finishFlush=undefined', { finishFlush: undefined }],
        ])('%s', async (_, options) => {
            await expect(compress('', { ...options, algorithm: 'gzip' })).rejects.toThrowWithMessageFixed(
                Error,
                `The following compress options are not allowed: finishFlush`,
            );
        });
        it('flush x finishFlush', async () => {
            const options: zlib.ZlibOptions = {
                flush: zlib.constants.Z_SYNC_FLUSH,
                finishFlush: undefined,
            };
            await expect(compress('', { ...options, algorithm: 'gzip' })).rejects.toThrowWithMessageFixed(
                Error,
                `The following compress options are not allowed: flush, finishFlush`,
            );
        });
        it('flush x finishFlush x info', async () => {
            const options: zlib.ZlibOptions = {
                info: false,
                flush: zlib.constants.Z_SYNC_FLUSH,
                finishFlush: undefined,
            };
            await expect(compress('', { ...options, algorithm: 'gzip' })).rejects.toThrowWithMessageFixed(
                Error,
                `The following compress options are not allowed: flush, finishFlush, info`,
            );
        });
    });
});

describe('decompressIterable()', () => {
    const buffer2generator = async function*(buffer: Buffer, chunkSize = 5): AsyncGenerator<Buffer, void> {
        while (buffer.byteLength > 0) {
            yield buffer.subarray(0, chunkSize);
            buffer = buffer.subarray(chunkSize);
        }
    };

    describe('decompress data', () => {
        const data = Buffer.from('Hello World!'.repeat(20));
        it.each<CompressAlgorithmName>([
            'gzip',
            'brotli',
        ])('%s', async algorithm => {
            const { data: compressedData } = await compress(data, algorithm);
            const compressedIterable = buffer2generator(compressedData);
            const decompressedIterable = decompressIterable(compressedIterable, algorithm);
            const decompressedData = await iterable2buffer(decompressedIterable);
            expect(decompressedData.equals(data)).toBeTrue();
        });
    });

    it('unknown algorithm', async () => {
        const algorithm = 'foooooooooooooo';
        const emptyIterable = buffer2generator(Buffer.from(''));

        // @ts-expect-error TS2345: Argument of type '"foooooooooooooo"' is not assignable to parameter of type '"gzip" | "brotli"'.
        await expect(iterable2buffer(decompressIterable(emptyIterable, algorithm))).rejects.toThrowWithMessageFixed(
            TypeError,
            `Unknown compress algorithm was received: ${algorithm}`,
        );
    });

    describe('decompress with options', () => {
        const data = Buffer.from('Hello World!'.repeat(20));

        describe('gzip', () => {
            it.each(optGen<zlib.ZlibOptions>({
                chunkSize: [undefined, 2 ** 6, 2 ** 10, 2 ** 14, 2 ** 20],
                windowBits: [undefined, 9, 10, 11, 12, 13, 14, 15],
                level: [undefined, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
                memLevel: [undefined, 1, 2, 3, 4, 5, 6, 7, 8, 9],
                strategy: [undefined, 0, 1, 2, 3, 4],
            }))('{ %s }', async (_, options) => {
                const { data: compressedData } = await compress(data, { ...options, algorithm: 'gzip' });
                const compressedIterable = buffer2generator(compressedData);
                const decompressedIterable = decompressIterable(compressedIterable, 'gzip');
                const decompressedData = await iterable2buffer(decompressedIterable);
                expect(decompressedData.equals(data)).toBeTrue();
            });
        });
    });
});
