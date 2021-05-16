import type * as stream from 'stream';
import { createBrotliCompress, createBrotliDecompress, createGunzip, createGzip } from 'zlib';

import { fixNodePrimordialsErrorStackTrace, printObject } from './utils';
import { writeFromIterableToStream } from './utils/stream';
import type { AsyncIterableReturn, ObjectValue } from './utils/type';

interface CompressorTableEntry {
    createCompress: (options: never) => () => stream.Transform;
    createDecompress: () => stream.Transform;
}

type Table2CompressOptions<T extends Record<string, CompressorTableEntry>> = ObjectValue<
    {
        [P in keyof T]: { algorithm: P } & Exclude<Parameters<T[P]['createCompress']>[0], undefined>;
    }
>;
type GetOptions<T extends (options?: never) => stream.Transform> = (
    T extends ((options?: infer U) => stream.Transform) ? U : never
);

const zlibDisallowOptionNameList = ['flush', 'finishFlush', 'dictionary', 'info'] as const;
type ZlibDisallowOptionName = (typeof zlibDisallowOptionNameList)[number];
type GzipOptions = GetOptions<typeof createGzip>;
type GzipDisallowedOptions = Omit<GzipOptions, ZlibDisallowOptionName>;

const compressorTable = (<T extends Record<string, CompressorTableEntry>>(record: T) => record)({
    gzip: {
        createCompress: (zlibOptions: GzipDisallowedOptions) => {
            const disallowOptionList = zlibDisallowOptionNameList.filter(optName => optName in zlibOptions);
            if (disallowOptionList.length > 0) {
                throw new Error(`The following compress options are not allowed: ${disallowOptionList.join(', ')}`);
            }
            return () => createGzip(zlibOptions);
        },
        createDecompress: createGunzip,
    },
    brotli: {
        createCompress: (options: GetOptions<typeof createBrotliCompress>) => () => createBrotliCompress(options),
        createDecompress: createBrotliDecompress,
    },
});

export type CompressOptions = Table2CompressOptions<typeof compressorTable>;
export type CompressAlgorithmName = CompressOptions['algorithm'];
export type CompressOptionsWithString = CompressOptions | CompressAlgorithmName;

export function createCompressor(options: CompressOptionsWithString | undefined): {
    compressAlgorithmName: CompressAlgorithmName | undefined;
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
    algorithm: CompressAlgorithmName,
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
