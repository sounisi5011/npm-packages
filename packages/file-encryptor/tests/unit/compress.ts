import * as zlib from 'zlib';

import { compress, decompress } from '../../src/compress';
import { optGen } from '../helpers/combinations';

describe('compress()', () => {
    describe('compress data', () => {
        const data = Buffer.from('Hello World!'.repeat(20));

        it('gzip (string options)', async () => {
            const { data: compressedData } = await compress(data, 'gzip');
            expect(compressedData.byteLength).toBeLessThan(data.byteLength);
        });

        it('gzip (object options)', async () => {
            const { data: compressedData } = await compress(data, { algorithm: 'gzip' });
            expect(compressedData.byteLength).toBeLessThan(data.byteLength);
        });

        it('brotli (string options)', async () => {
            const { data: compressedData } = await compress(data, 'brotli');
            expect(compressedData.byteLength).toBeLessThan(data.byteLength);
        });

        it('brotli (object options)', async () => {
            const { data: compressedData } = await compress(data, { algorithm: 'brotli' });
            expect(compressedData.byteLength).toBeLessThan(data.byteLength);
        });
    });

    it('unknown algorithm', async () => {
        const algorithm = 'foooooooooooooo';

        // @ts-expect-error TS2345: Argument of type '"foooooooooooooo"' is not assignable to parameter of type 'CompressOptionsWithString'.
        const resultPromise = compress('', algorithm);
        await expect(resultPromise).rejects.toThrow(TypeError);
        await expect(resultPromise).rejects.toThrow(`Unknown compress algorithm was received: ${algorithm}`);
    });
});

describe('decompress()', () => {
    describe('decompress data', () => {
        const data = Buffer.from('Hello World!'.repeat(20));

        it('gzip', async () => {
            const { data: compressedData } = await compress(data, 'gzip');
            const decompressedData = await decompress(compressedData, 'gzip');
            expect(decompressedData.equals(data)).toBeTrue();
        });

        it('brotli', async () => {
            const { data: compressedData } = await compress(data, 'brotli');
            const decompressedData = await decompress(compressedData, 'brotli');
            expect(decompressedData.equals(data)).toBeTrue();
        });
    });

    it('unknown algorithm', async () => {
        const algorithm = 'foooooooooooooo';

        // @ts-expect-error TS2345: Argument of type '"foooooooooooooo"' is not assignable to parameter of type 'CompressOptionsWithString'.
        const resultPromise = decompress('', algorithm);
        await expect(resultPromise).rejects.toThrow(TypeError);
        await expect(resultPromise).rejects.toThrow(`Unknown compress algorithm was received: ${algorithm}`);
    });

    describe('decompress with options', () => {
        describe('gzip', () => {
            const flushConstantsMap = {
                record: zlib.constants,
                /**
                 * @see https://github.com/nodejs/node/blob/v15.14.0/lib/zlib.js#L81-L82
                 */
                names: ['Z_NO_FLUSH', 'Z_BLOCK', 'Z_PARTIAL_FLUSH', 'Z_SYNC_FLUSH', 'Z_FULL_FLUSH', 'Z_FINISH'],
            };
            it.each(optGen<zlib.ZlibOptions>({
                chunkSize: [undefined, 2 ** 6, 2 ** 10, 2 ** 14, 2 ** 20],
                windowBits: [undefined, 9, 10, 11, 12, 13, 14, 15],
                level: [undefined, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
                memLevel: [undefined, 1, 2, 3, 4, 5, 6, 7, 8, 9],
                strategy: [undefined, 0, 1, 2, 3, 4],
            }))('{ %s }', async (_, options) => {
                const data = Buffer.from('Hello World!'.repeat(20));

                const { data: compressedData } = await compress(data, { ...options, algorithm: 'gzip' });
                const decompressedData = await decompress(compressedData, 'gzip');
                expect(decompressedData.equals(data)).toBeTrue();
            });
            it.each(optGen<zlib.ZlibOptions>({
                flush: [undefined, 0, 1, 2, 3, 4, 5],
                finishFlush: [undefined, 0, 1, 2, 3, 4, 5],
            }, {
                flush: flushConstantsMap,
                finishFlush: flushConstantsMap,
            }))('{ %s }', async (_, options) => {
                const data = Buffer.from('Hello World!'.repeat(20));

                const { data: compressedData } = await compress(data, { ...options, algorithm: 'gzip' });
                const decompressedData = await decompress(compressedData, 'gzip');
                expect(decompressedData.equals(data)).toBeTrue();
            });
            it.each(optGen<zlib.ZlibOptions>({
                info: [true, false],
            }))('{ %s }', async (_, options) => {
                const data = Buffer.from('Hello World!'.repeat(20));

                const { data: compressedData } = await compress(data, { ...options, algorithm: 'gzip' });
                const decompressedData = await decompress(compressedData, 'gzip');
                expect(decompressedData.equals(data)).toBeTrue();
            });
        });
    });
});
