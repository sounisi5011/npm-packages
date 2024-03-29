import * as zlib from 'zlib';

import { createCompressor, decompressIterable } from '../../src/core/compress';
import type { CompressOptions } from '../../src/runtimes/node/compress';
import { compressionAlgorithm } from '../../src/runtimes/node/compress';
import { inspect } from '../../src/runtimes/node/utils';
import { buffer2asyncIterable, iterable2buffer } from '../helpers';
import { optGen } from '../helpers/combinations';

const builtin = { compressionAlgorithm, inspect };

describe('createCompressor()', () => {
    describe('compress data', () => {
        const data = Buffer.from('Hello World!'.repeat(20));

        describe.each<CompressOptions['algorithm']>([
            'gzip',
            'brotli',
        ])('%s', algorithm => {
            it.each<[string, CompressOptions | CompressOptions['algorithm']]>([
                ['string options', algorithm],
                ['object options', { algorithm }],
            ])('%s', async (_, options) => {
                const sourceAsyncIterable = buffer2asyncIterable(data);
                const compressedIterable = createCompressor(builtin, options)
                    .compressIterable(sourceAsyncIterable);
                const compressedData = await iterable2buffer(compressedIterable);
                expect(compressedData).toBeLessThanByteSize(data);
            });
            it('reuse compressIterable()', async () => {
                const { compressIterable } = createCompressor(builtin, algorithm);

                const data1 = await iterable2buffer(compressIterable(buffer2asyncIterable(data)));
                const data2 = await iterable2buffer(compressIterable(buffer2asyncIterable(data)));

                expect(data1.equals(data2)).toBeTrue();
            });
        });
    });

    it('unknown algorithm', () => {
        // @ts-expect-error TS2322: Type '"foooooooooooooo"' is not assignable to type '"gzip" | "brotli"'.
        const algorithm: CompressOptions['algorithm'] = 'foooooooooooooo';

        expect(() => createCompressor(builtin, algorithm)).toThrowWithMessage(
            TypeError,
            `Unknown compress algorithm was received: ${algorithm}`,
        );
    });

    describe('invalid type options', () => {
        it.each<[unknown]>([
            [42],
            [{ algorithm: 42 }],
        ])('%o', invalidAlgorithm => {
            // @ts-expect-error TS2322: Type 'unknown' is not assignable to type '"gzip" | "brotli" | BaseCompressOptions | undefined'.
            const algorithm: Parameters<typeof createCompressor>[1] = invalidAlgorithm;
            expect(() => createCompressor(builtin, algorithm)).toThrowWithMessage(
                TypeError,
                `Unknown compress algorithm was received: 42`,
            );
        });
    });

    describe('not allowed options', () => {
        describe('gzip', () => {
            const algorithm = 'gzip';

            it.each<[string, zlib.ZlibOptions]>([
                ['info=true', { info: true }],
                ['info=false', { info: false }],
                ['info=undefined', { info: undefined }],
            ])('%s', (_, options) => {
                expect(() => createCompressor(builtin, { ...options, algorithm })).toThrowWithMessage(
                    Error,
                    `The following gzip compress options are not allowed: info`,
                );
            });
            it.each<[string, zlib.ZlibOptions]>([
                ['flush=Z_FINISH', { flush: zlib.constants.Z_FINISH }],
                ['flush=0', { flush: 0 }],
                ['flush=undefined', { flush: undefined }],
            ])('%s', (_, options) => {
                expect(() => createCompressor(builtin, { ...options, algorithm })).toThrowWithMessage(
                    Error,
                    `The following gzip compress options are not allowed: flush`,
                );
            });
            it.each<[string, zlib.ZlibOptions]>([
                ['finishFlush=Z_BLOCK', { finishFlush: zlib.constants.Z_BLOCK }],
                ['finishFlush=0', { finishFlush: 0 }],
                ['finishFlush=undefined', { finishFlush: undefined }],
            ])('%s', (_, options) => {
                expect(() => createCompressor(builtin, { ...options, algorithm })).toThrowWithMessage(
                    Error,
                    `The following gzip compress options are not allowed: finishFlush`,
                );
            });
            it('flush x finishFlush', () => {
                const options: zlib.ZlibOptions = {
                    flush: zlib.constants.Z_SYNC_FLUSH,
                    finishFlush: undefined,
                };
                expect(() => createCompressor(builtin, { ...options, algorithm })).toThrowWithMessage(
                    Error,
                    `The following gzip compress options are not allowed: flush, finishFlush`,
                );
            });
            it('flush x finishFlush x info', () => {
                const options: zlib.ZlibOptions = {
                    info: false,
                    flush: zlib.constants.Z_SYNC_FLUSH,
                    finishFlush: undefined,
                };
                expect(() => createCompressor(builtin, { ...options, algorithm })).toThrowWithMessage(
                    Error,
                    `The following gzip compress options are not allowed: flush, finishFlush, info`,
                );
            });
            it('all', () => {
                const options: zlib.ZlibOptions = {
                    flush: undefined,
                    finishFlush: undefined,
                    chunkSize: undefined,
                    windowBits: undefined,
                    level: undefined,
                    memLevel: undefined,
                    strategy: undefined,
                    dictionary: undefined,
                    info: undefined,
                    maxOutputLength: undefined,
                };
                expect(() => createCompressor(builtin, { ...options, algorithm })).toThrowWithMessage(
                    Error,
                    `The following gzip compress options are not allowed: flush, finishFlush, dictionary, info, maxOutputLength`,
                );
            });
        });

        describe('brotli', () => {
            const algorithm = 'brotli';

            it.each<[string, zlib.BrotliOptions]>([
                ['flush=BROTLI_OPERATION_PROCESS', { flush: zlib.constants.BROTLI_OPERATION_PROCESS }],
                ['flush=0', { flush: 0 }],
                ['flush=undefined', { flush: undefined }],
            ])('%s', (_, options) => {
                expect(() => createCompressor(builtin, { ...options, algorithm })).toThrowWithMessage(
                    Error,
                    `The following brotli compress options are not allowed: flush`,
                );
            });
            it.each<[string, zlib.BrotliOptions]>([
                ['finishFlush=BROTLI_OPERATION_FINISH', { finishFlush: zlib.constants.BROTLI_OPERATION_FINISH }],
                ['finishFlush=0', { finishFlush: 0 }],
                ['finishFlush=undefined', { finishFlush: undefined }],
            ])('%s', (_, options) => {
                expect(() => createCompressor(builtin, { ...options, algorithm })).toThrowWithMessage(
                    Error,
                    `The following brotli compress options are not allowed: finishFlush`,
                );
            });
            it('flush x finishFlush', () => {
                const options: zlib.BrotliOptions = {
                    flush: zlib.constants.BROTLI_OPERATION_FLUSH,
                    finishFlush: undefined,
                };
                expect(() => createCompressor(builtin, { ...options, algorithm })).toThrowWithMessage(
                    Error,
                    `The following brotli compress options are not allowed: flush, finishFlush`,
                );
            });
            it('all', () => {
                const options: zlib.BrotliOptions = {
                    flush: undefined,
                    finishFlush: undefined,
                    chunkSize: undefined,
                    params: undefined,
                    maxOutputLength: undefined,
                };
                expect(() => createCompressor(builtin, { ...options, algorithm })).toThrowWithMessage(
                    Error,
                    `The following brotli compress options are not allowed: flush, finishFlush, maxOutputLength`,
                );
            });
        });
    });
});

describe('decompressIterable()', () => {
    describe('decompress data', () => {
        const data = Buffer.from('Hello World!'.repeat(20));
        it.each<CompressOptions['algorithm']>([
            'gzip',
            'brotli',
        ])('%s', async algorithm => {
            const sourceAsyncIterable = buffer2asyncIterable(data);
            const compressedIterable = createCompressor(builtin, algorithm)
                .compressIterable(sourceAsyncIterable);
            const decompressedIterable = decompressIterable(builtin, algorithm, compressedIterable);
            const decompressedData = await iterable2buffer(decompressedIterable);
            expect(decompressedData.equals(data)).toBeTrue();
        });
    });

    it('unknown algorithm', async () => {
        // @ts-expect-error TS2322: Type '"foooooooooooooo"' is not assignable to type '"gzip" | "brotli"'.
        const algorithm: Parameters<typeof decompressIterable>[1] = 'foooooooooooooo';
        const emptyIterable = buffer2asyncIterable(Buffer.from(''));

        await expect(iterable2buffer(decompressIterable(builtin, algorithm, emptyIterable))).rejects.toThrowWithMessage(
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
                const compressedIterable = createCompressor(builtin, { ...options, algorithm: 'gzip' })
                    .compressIterable(sourceAsyncIterable);
                const decompressedIterable = decompressIterable(builtin, 'gzip', compressedIterable);
                const decompressedData = await iterable2buffer(decompressedIterable);
                expect(decompressedData.equals(data)).toBeTrue();
            });
        });
    });
});
