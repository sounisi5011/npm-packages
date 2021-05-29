import type * as stream from 'stream';

import { writeFromIterableToStream } from '../utils/stream';
import type { AsyncIterableReturn, ObjectValue } from '../utils/type';
import { fixNodePrimordialsErrorStackTrace, printObject } from '../utils';
import { createCompress as createBrotliCompress, createDecompress as createBrotliDecompress } from './brotli';
import { createCompress as createGzipCompress, createDecompress as createGzipDecompress } from './gzip';

interface CompressorTableEntry {
    createCompress: (options: never) => () => stream.Transform;
    createDecompress: () => stream.Transform;
}

type Table2CompressOptions<T extends Record<string, CompressorTableEntry>> = ObjectValue<
    {
        [P in keyof T]: { algorithm: P } & Exclude<Parameters<T[P]['createCompress']>[0], undefined>;
    }
>;
export type GetOptions<T extends (options?: never) => stream.Transform> = (
    T extends ((options?: infer U) => stream.Transform) ? U : never
);

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

export type CompressOptions = Table2CompressOptions<typeof compressorTable>;

export function createCompressor(options: CompressOptions | CompressOptions['algorithm'] | undefined): {
    compressAlgorithmName: CompressOptions['algorithm'] | undefined;
    compressIterable: (source: AsyncIterable<Buffer>) => AsyncIterableReturn<Buffer, void>;
} {
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
}

export async function* decompressIterable(
    data: Iterable<Buffer> | AsyncIterable<Buffer>,
    algorithm: CompressOptions['algorithm'],
): AsyncIterableReturn<Buffer, void> {
    const entry = compressorTable[algorithm];
    if (!entry) {
        throw new TypeError(
            `Unknown compress algorithm was received: ${printObject(algorithm, { passThroughString: true })}`,
        );
    }

    const decompressStream = entry.createDecompress();
    try {
        yield* writeFromIterableToStream(data, decompressStream);
    } catch (error) {
        fixNodePrimordialsErrorStackTrace(error);
    }
}
