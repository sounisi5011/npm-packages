import { Readable } from 'stream';
import type * as stream from 'stream';
import { promisify } from 'util';
import { brotliCompress, brotliDecompress, createBrotliDecompress, createGunzip, gunzip, gzip } from 'zlib';
import type * as zlib from 'zlib';

import { fixNodePrimordialsErrorStackTrace, printObject } from './utils';
import { pipelineWithoutCallback } from './utils/stream';
import type { ObjectValue } from './utils/type';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);
const brotliDecompressAsync = promisify(brotliDecompress);

interface CompressorTableEntry {
    compressAsync: (data: never, options: never) => Promise<Buffer>;
    createDecompress: () => stream.Transform;
}

type Table2CompressOptions<T extends Record<string, CompressorTableEntry>> = ObjectValue<
    {
        [P in keyof T]: { algorithm: P } & Exclude<Parameters<T[P]['compressAsync']>[1], undefined>;
    }
>;

const zlibDisallowOptionNameList = ['flush', 'finishFlush', 'dictionary', 'info'] as const;
type ZlibDisallowOptionName = (typeof zlibDisallowOptionNameList)[number];

const compressorTable = (<T extends Record<string, CompressorTableEntry>>(record: T) => record)({
    gzip: {
        compressAsync: async (
            data: Parameters<typeof gzipAsync>[0],
            zlibOptions: Omit<zlib.ZlibOptions, ZlibDisallowOptionName>,
        ) => {
            const disallowOptionList = zlibDisallowOptionNameList.filter(optName => optName in zlibOptions);
            if (disallowOptionList.length > 0) {
                throw new Error(`The following compress options are not allowed: ${disallowOptionList.join(', ')}`);
            }
            return await gzipAsync(data, zlibOptions);
        },
        createDecompress: createGunzip,
    },
    brotli: {
        compressAsync: promisify(brotliCompress),
        createDecompress: createBrotliDecompress,
    },
});

export type CompressInput = Parameters<ObjectValue<typeof compressorTable>['compressAsync']>[0];
export type CompressOptions = Table2CompressOptions<typeof compressorTable>;
export type CompressAlgorithmName = CompressOptions['algorithm'];
export type CompressOptionsWithString = CompressOptions | CompressAlgorithmName;

export async function compress(
    data: CompressInput,
    options: CompressOptionsWithString,
): Promise<{ algorithm: CompressAlgorithmName; data: Buffer }> {
    const normalizedOptions = typeof options === 'string' ? { algorithm: options } : options;
    const entry = compressorTable[normalizedOptions.algorithm];
    if (entry) {
        const { algorithm, ...options } = normalizedOptions;
        return {
            algorithm,
            data: await entry.compressAsync(data, options).catch(fixNodePrimordialsErrorStackTrace),
        };
    }
    throw new TypeError(
        `Unknown compress algorithm was received: ${
            printObject(normalizedOptions.algorithm, { passThroughString: true })
        }`,
    );
}

export async function decompress(data: zlib.InputType, algorithm: CompressAlgorithmName): Promise<Buffer> {
    if (algorithm === 'gzip') {
        return await gunzipAsync(data).catch(fixNodePrimordialsErrorStackTrace);
    } else if (algorithm === 'brotli') {
        return await brotliDecompressAsync(data).catch(fixNodePrimordialsErrorStackTrace);
    }
    throw new TypeError(
        `Unknown compress algorithm was received: ${printObject(algorithm, { passThroughString: true })}`,
    );
}

export async function* decompressGenerator(
    data: Iterable<Buffer> | AsyncIterable<Buffer>,
    algorithm: CompressAlgorithmName,
): AsyncGenerator<Buffer, void> {
    const entry = compressorTable[algorithm];
    if (!entry) {
        throw new TypeError(
            `Unknown compress algorithm was received: ${printObject(algorithm, { passThroughString: true })}`,
        );
    }

    const decompressStream = entry.createDecompress();
    try {
        for await (const chunk of pipelineWithoutCallback(Readable.from(data), decompressStream)) {
            yield chunk;
        }
    } catch (error) {
        fixNodePrimordialsErrorStackTrace(error);
    }
}
