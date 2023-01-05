import { createBrotliCompress, createBrotliDecompress } from 'zlib';

import type { GetOptions } from '../../../core/types/utils';
import { genCompressData, validateDisallowedOptions } from './utils';

const brotliDisallowOptionNameList = ['flush', 'finishFlush', 'maxOutputLength'] as const;
type BrotliDisallowOptionName = (typeof brotliDisallowOptionNameList)[number];
type BrotliOptions = GetOptions<typeof createBrotliCompress>;
type BrotliDisallowedOptions = Omit<BrotliOptions, BrotliDisallowOptionName>;

export const brotli = genCompressData<BrotliDisallowedOptions>({
    validateCompressOptions: options =>
        validateDisallowedOptions(
            options,
            brotliDisallowOptionNameList,
            'The following brotli compress options are not allowed: %s',
        ),
    createCompress: createBrotliCompress,
    createDecompress: createBrotliDecompress,
});
