import { createBrotliCompress, createBrotliDecompress } from 'zlib';

import type { CompressData } from '../../../core/types/compress';
import type { GetOptions } from '../../../core/types/utils';
import { fixNodePrimordialsErrorStackTrace } from '../utils';
import { validateDisallowedOptions, writeFromIterableToStream } from './utils';

const brotliDisallowOptionNameList = ['flush', 'finishFlush', 'maxOutputLength'] as const;
type BrotliDisallowOptionName = (typeof brotliDisallowOptionNameList)[number];
type BrotliOptions = GetOptions<typeof createBrotliCompress>;
type BrotliDisallowedOptions = Omit<BrotliOptions, BrotliDisallowOptionName>;

export const brotli: CompressData<BrotliDisallowedOptions> = {
    createCompress(options) {
        validateDisallowedOptions(
            options,
            brotliDisallowOptionNameList,
            'The following brotli compress options are not allowed: %s',
        );
        return async function*(source) {
            // Note: To prevent reuse of the Stream object, create it here.
            const compressStream = createBrotliCompress(options);
            try {
                yield* writeFromIterableToStream(source, compressStream);
            } catch (error) {
                fixNodePrimordialsErrorStackTrace(error);
            }
        };
    },
    async *decompress(source) {
        const decompressStream = createBrotliDecompress();
        try {
            yield* writeFromIterableToStream(source, decompressStream);
        } catch (error) {
            fixNodePrimordialsErrorStackTrace(error);
        }
    },
};
