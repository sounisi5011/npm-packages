import { createBrotliCompress, createBrotliDecompress } from 'zlib';

import type { GetOptions } from '../../../core/types/utils';
import { validateDisallowedOptions } from './utils';

const brotliDisallowOptionNameList = ['flush', 'finishFlush', 'maxOutputLength'] as const;
type BrotliDisallowOptionName = (typeof brotliDisallowOptionNameList)[number];
type BrotliOptions = GetOptions<typeof createBrotliCompress>;
type BrotliDisallowedOptions = Omit<BrotliOptions, BrotliDisallowOptionName>;

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function createCompress(options: BrotliDisallowedOptions) {
    validateDisallowedOptions(
        options,
        brotliDisallowOptionNameList,
        'The following brotli compress options are not allowed: %s',
    );
    return () => createBrotliCompress(options);
}

export { createBrotliDecompress as createDecompress };
