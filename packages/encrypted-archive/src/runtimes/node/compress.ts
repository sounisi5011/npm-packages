import type * as stream from 'stream';

import type { CompressAlgorithmName, CreateCompressor, DecompressIterable } from '../../core/types/compress';
import type { GetOptions } from '../../core/types/utils';
import { passThroughString } from '../../core/utils';
import * as brotli from './compress/brotli';
import * as gzip from './compress/gzip';
import { fixNodePrimordialsErrorStackTrace, inspect, writeFromIterableToStream } from './utils';

interface CompressorTableEntry {
    createCompress: (options: never) => () => stream.Transform;
    createDecompress: () => stream.Transform;
}
type GenCompressOptions<T extends Record<CompressAlgorithmName, CompressorTableEntry>> = {
    [P in keyof T]: T[P] extends CompressorTableEntry ? { algorithm: P } & GetOptions<T[P]['createCompress']>
        : never;
}[keyof T];

const compressorTable = {
    gzip,
    brotli,
} as const;
export type CompressOptions = GenCompressOptions<typeof compressorTable>;

export const createCompressor: CreateCompressor<CompressOptions> = options => {
    if (!options) return { compressAlgorithmName: undefined, compressIterable: source => source };

    const { algorithm, ...compressOptions } = typeof options === 'string' ? { algorithm: options } : options;

    const entry = compressorTable[algorithm];
    if (!entry) {
        throw new TypeError(
            `Unknown compress algorithm was received: ${passThroughString(inspect, algorithm)}`,
        );
    }

    const createCompressStream = entry.createCompress(compressOptions);
    return {
        compressAlgorithmName: algorithm,
        async *compressIterable(source) {
            // Note: To prevent reuse of the Stream object, create it here.
            const compressStream = createCompressStream();
            try {
                yield* writeFromIterableToStream(source, compressStream);
            } catch (error) {
                fixNodePrimordialsErrorStackTrace(error);
            }
        },
    };
};

export const decompressIterable: DecompressIterable = async function*(algorithmName, source) {
    const entry = compressorTable[algorithmName];
    if (!entry) {
        throw new TypeError(
            `Unknown compress algorithm was received: ${passThroughString(inspect, algorithmName)}`,
        );
    }

    const decompressStream = entry.createDecompress();
    try {
        yield* writeFromIterableToStream(source, decompressStream);
    } catch (error) {
        fixNodePrimordialsErrorStackTrace(error);
    }
};
