import type { AsyncIterableReturn, ExpandObject } from './utils';

export type CompressAlgorithmName = (typeof compressAlgorithmNameList)[number];
export interface BaseCompressOptions {
    algorithm: CompressAlgorithmName;
}
type CompressIteratorConverter = (source: AsyncIterable<Uint8Array>) => AsyncIterableReturn<Uint8Array, void>;
export interface CompressData<TCompressorOptions> {
    createCompress: (options: TCompressorOptions) => CompressIteratorConverter;
    decompress: CompressIteratorConverter;
}
type BaseCompressorRecord = Partial<Record<CompressAlgorithmName, CompressData<never>>>;

// ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- //

export type GenCompressOptions<T extends BaseCompressorRecord> = ExpandObject<
    {
        [P in keyof T]: T[P] extends CompressData<infer U> ? { algorithm: P } & U
            : never;
    }[keyof T]
>;

export interface CreateCompressorResult<TCompressOptions extends BaseCompressOptions> {
    compressAlgorithmName: TCompressOptions['algorithm'] | undefined;
    compressIterable: CompressIteratorConverter;
}
export type TryCreateCompressor = (
    <TCompressOptions extends BaseCompressOptions>(
        options: TCompressOptions | Pick<TCompressOptions, 'algorithm'>,
    ) => CreateCompressorResult<TCompressOptions> | undefined
);
export interface CompressionAlgorithmBuiltinAPI {
    algorithmRecord: BaseCompressorRecord;
    tryCreateCompressor: TryCreateCompressor;
}

export const compressAlgorithmNameList = ['gzip', 'brotli'] as const;
