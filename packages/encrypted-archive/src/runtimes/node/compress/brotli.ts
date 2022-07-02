import { createBrotliCompress, createBrotliDecompress } from 'zlib';

import { BrotliDisallowedOptions, brotliDisallowOptionNameList } from '../../../core/types/compress';
import { validateDisallowedOptions } from './utils';

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
