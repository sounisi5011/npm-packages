import type * as stream from 'stream';

import type { CreateCompressor, DecompressIterable } from '../../core/types/compress';
import { printObject } from '../../core/utils';
import { writeFromIterableToStream } from '../../core/utils/stream';
import * as brotli from './compress/brotli';
import * as gzip from './compress/gzip';
import { fixNodePrimordialsErrorStackTrace } from './utils';

interface CompressorTableEntry {
    createCompress: (options: never) => () => stream.Transform;
    createDecompress: () => stream.Transform;
}

const compressorTable = (<T extends Record<string, CompressorTableEntry>>(record: T) => record)({
    gzip,
    brotli,
});

export const createCompressor: CreateCompressor = options => {
    if (!options) return { compressAlgorithmName: undefined, compressIterable: source => source };

    const { algorithm, ...compressOptions } = typeof options === 'string' ? { algorithm: options } : options;

    const entry = compressorTable[algorithm];
    if (!entry) {
        throw new TypeError(
            `Unknown compress algorithm was received: ${printObject(algorithm, { passThroughString: true })}`,
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
            `Unknown compress algorithm was received: ${printObject(algorithmName, { passThroughString: true })}`,
        );
    }

    const decompressStream = entry.createDecompress();
    try {
        yield* writeFromIterableToStream(source, decompressStream);
    } catch (error) {
        fixNodePrimordialsErrorStackTrace(error);
    }
};
