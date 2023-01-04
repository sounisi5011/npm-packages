import type { CompressionAlgorithmBuiltinAPI, GenCompressOptions } from '../../core/types/compress';
import { brotli } from './compress/brotli';
import { gzip } from './compress/gzip';

const algorithmRecord = {
    gzip,
    brotli,
} as const;
export type CompressOptions = GenCompressOptions<typeof algorithmRecord>;

export const compressionAlgorithm: CompressionAlgorithmBuiltinAPI = {
    algorithmRecord,
    tryCreateCompressor({ algorithm, ...compressOptions }) {
        const entry = algorithmRecord[algorithm];
        if (!entry) return;
        return {
            compressAlgorithmName: algorithm,
            compressIterable: entry.createCompress(compressOptions),
        };
    },
};
