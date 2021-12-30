import type * as stream from 'stream';

import type { CreateCompressor, DecompressIterable } from '../../core/types/compress';
import { fixNodePrimordialsErrorStackTrace, passThroughString } from '../../core/utils';
import { inspect } from '../utils';
import { writeFromIterableToStream } from '../utils/stream';
import { createCompress as createBrotliCompress, createDecompress as createBrotliDecompress } from './brotli';
import { createCompress as createGzipCompress, createDecompress as createGzipDecompress } from './gzip';

interface CompressorTableEntry {
    createCompress: (options: never) => () => stream.Transform;
    createDecompress: () => stream.Transform;
}

const compressorTable = (<T extends Record<string, CompressorTableEntry>>(record: T) => record)({
    gzip: {
        createCompress: createGzipCompress,
        createDecompress: createGzipDecompress,
    },
    brotli: {
        createCompress: createBrotliCompress,
        createDecompress: createBrotliDecompress,
    },
});

const createCompressor: CreateCompressor = options => {
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

const decompressIterable: DecompressIterable = async function*(algorithm, data) {
    const entry = compressorTable[algorithm];
    if (!entry) {
        throw new TypeError(
            `Unknown compress algorithm was received: ${passThroughString(inspect, algorithm)}`,
        );
    }

    const decompressStream = entry.createDecompress();
    try {
        yield* writeFromIterableToStream(data, decompressStream);
    } catch (error) {
        fixNodePrimordialsErrorStackTrace(error);
    }
};

export { createCompressor, decompressIterable };
