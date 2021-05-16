import * as zlib from 'zlib';

import {
    CompressAlgorithmName,
    CompressOptionsWithString,
    createCompressor,
    decompressIterable,
} from '../../src/compress';
import { buffer2asyncIterable, iterable2buffer } from '../helpers';
import { optGen } from '../helpers/combinations';
import '../helpers/jest-matchers';

describe('createCompressor()', () => {
    describe('compress data', () => {
        const data = Buffer.from('Hello World!'.repeat(20));

        describe.each<CompressAlgorithmName>([
            'gzip',
            'brotli',
        ])('%s', algorithm => {
            it.each<[string, CompressOptionsWithString]>([
                ['string options', algorithm],
                ['object options', { algorithm }],
            ])('%s', async (_, options) => {
                const sourceAsyncIterable = buffer2asyncIterable(data);
                const compressedIterable = createCompressor(options)
                    .compressIterable(sourceAsyncIterable);
                const compressedData = await iterable2buffer(compressedIterable);
                expect(compressedData.byteLength).toBeLessThanByteSize(data.byteLength);
            });
            it('reuse compressIterable()', async () => {
                const { compressIterable } = createCompressor(algorithm);

                const data1 = await iterable2buffer(compressIterable(buffer2asyncIterable(data)));
                const data2 = await iterable2buffer(compressIterable(buffer2asyncIterable(data)));

                expect(data1.equals(data2)).toBeTrue();
            });
        });
    });

    it('unknown algorithm', () => {
        const algorithm = 'foooooooooooooo';

        // @ts-expect-error TS2345: Argument of type '"foooooooooooooo"' is not assignable to parameter of type 'CompressOptionsWithString | undefined'.
        expect(() => createCompressor(algorithm)).toThrowWithMessageFixed(
            TypeError,
            `Unknown compress algorithm was received: ${algorithm}`,
        );
    });

    describe('not allowed options', () => {
        it.each<[string, zlib.ZlibOptions]>([
            ['info=true', { info: true }],
            ['info=false', { info: false }],
            ['info=undefined', { info: undefined }],
        ])('%s', (_, options) => {
            expect(() => createCompressor({ ...options, algorithm: 'gzip' })).toThrowWithMessageFixed(
                Error,
                `The following compress options are not allowed: info`,
            );
        });
        it.each<[string, zlib.ZlibOptions]>([
            ['flush=Z_FINISH', { flush: zlib.constants.Z_FINISH }],
            ['flush=0', { flush: 0 }],
            ['flush=undefined', { flush: undefined }],
        ])('%s', (_, options) => {
            expect(() => createCompressor({ ...options, algorithm: 'gzip' })).toThrowWithMessageFixed(
                Error,
                `The following compress options are not allowed: flush`,
            );
        });
        it.each<[string, zlib.ZlibOptions]>([
            ['finishFlush=Z_BLOCK', { finishFlush: zlib.constants.Z_BLOCK }],
            ['finishFlush=0', { finishFlush: 0 }],
            ['finishFlush=undefined', { finishFlush: undefined }],
        ])('%s', (_, options) => {
            expect(() => createCompressor({ ...options, algorithm: 'gzip' })).toThrowWithMessageFixed(
                Error,
                `The following compress options are not allowed: finishFlush`,
            );
        });
        it('flush x finishFlush', () => {
            const options: zlib.ZlibOptions = {
                flush: zlib.constants.Z_SYNC_FLUSH,
                finishFlush: undefined,
            };
            expect(() => createCompressor({ ...options, algorithm: 'gzip' })).toThrowWithMessageFixed(
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
            expect(() => createCompressor({ ...options, algorithm: 'gzip' })).toThrowWithMessageFixed(
                Error,
                `The following compress options are not allowed: flush, finishFlush, info`,
            );
        });
    });
});

describe('decompressIterable()', () => {
    describe('decompress data', () => {
        const data = Buffer.from('Hello World!'.repeat(20));
        it.each<CompressAlgorithmName>([
            'gzip',
            'brotli',
        ])('%s', async algorithm => {
            const sourceAsyncIterable = buffer2asyncIterable(data);
            const compressedIterable = createCompressor(algorithm)
                .compressIterable(sourceAsyncIterable);
            const decompressedIterable = decompressIterable(compressedIterable, algorithm);
            const decompressedData = await iterable2buffer(decompressedIterable);
            expect(decompressedData.equals(data)).toBeTrue();
        });
    });

    it('unknown algorithm', async () => {
        const algorithm = 'foooooooooooooo';
        const emptyIterable = buffer2asyncIterable(Buffer.from(''));

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
                windowBits: [undefined, 9, 10, 11, 12, 13, 14, 15],
                level: [undefined, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
                memLevel: [undefined, 1, 2, 3, 4, 5, 6, 7, 8, 9],
                strategy: [undefined, 0, 1, 2, 3, 4],
            }))('{ %s }', async (_, options) => {
                const sourceAsyncIterable = buffer2asyncIterable(data);
                const compressedIterable = createCompressor({ ...options, algorithm: 'gzip' })
                    .compressIterable(sourceAsyncIterable);
                const decompressedIterable = decompressIterable(compressedIterable, 'gzip');
                const decompressedData = await iterable2buffer(decompressedIterable);
                expect(decompressedData.equals(data)).toBeTrue();
            });
        });
    });
});
