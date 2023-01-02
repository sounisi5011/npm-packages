import type { AsyncIterableReturn } from './utils';

export type CompressAlgorithmName = 'gzip' | 'brotli';
export interface BaseCompressOptions {
    algorithm: CompressAlgorithmName;
}

// ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- //

export type CreateCompressor<TOpt extends BaseCompressOptions> = (
    options: TOpt | TOpt['algorithm'] | undefined,
) => {
    compressAlgorithmName: TOpt['algorithm'] | undefined;
    compressIterable: (source: AsyncIterable<Uint8Array>) => AsyncIterableReturn<Uint8Array, void>;
};
export type DecompressIterable = (
    algorithmName: CompressAlgorithmName,
    source: AsyncIterable<Uint8Array>,
) => AsyncIterableReturn<Uint8Array, void>;
