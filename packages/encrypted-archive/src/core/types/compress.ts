import type { createBrotliCompress, createGzip } from 'zlib';

import type { AsyncIterableReturn } from '../utils/type';

type GetOptions<T extends (options?: never) => unknown> = (
    T extends ((options?: infer U) => unknown) ? U : never
);
type GenCompressOptions<T extends CompressAlgorithmName, U extends Record<CompressAlgorithmName, object>> = T extends
    string ? { algorithm: T } & U[T] : never;

// ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- //

export const gzipDisallowOptionNameList = ['flush', 'finishFlush', 'dictionary', 'info', 'maxOutputLength'] as const;
type GzipDisallowOptionName = (typeof gzipDisallowOptionNameList)[number];
type GzipOptions = GetOptions<typeof createGzip>;
export type GzipDisallowedOptions = Omit<GzipOptions, GzipDisallowOptionName>;

export const brotliDisallowOptionNameList = ['flush', 'finishFlush', 'maxOutputLength'] as const;
type BrotliDisallowOptionName = (typeof brotliDisallowOptionNameList)[number];
type BrotliOptions = GetOptions<typeof createBrotliCompress>;
export type BrotliDisallowedOptions = Omit<BrotliOptions, BrotliDisallowOptionName>;

// ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- //

type CompressAlgorithmName = 'gzip' | 'brotli';
export type CompressOptions = GenCompressOptions<CompressAlgorithmName, {
    gzip: GzipDisallowedOptions;
    brotli: BrotliDisallowedOptions;
}>;

// ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- //

export type CreateCompressor = (
    options: CompressOptions | CompressOptions['algorithm'] | undefined,
) => {
    compressAlgorithmName: CompressOptions['algorithm'] | undefined;
    compressIterable: (source: AsyncIterable<Uint8Array>) => AsyncIterableReturn<Uint8Array, void>;
};
export type DecompressIterable = (
    algorithmName: CompressOptions['algorithm'],
    source: AsyncIterable<Uint8Array>,
) => AsyncIterableReturn<Uint8Array, void>;
