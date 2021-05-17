import { createBrotliCompress, createBrotliDecompress } from 'zlib';

import type { GetOptions } from '.';

const brotliDisallowOptionNameList = ['flush', 'finishFlush', 'maxOutputLength'] as const;
type BrotliDisallowOptionName = (typeof brotliDisallowOptionNameList)[number];
type BrotliOptions = GetOptions<typeof createBrotliCompress>;
type BrotliDisallowedOptions = Omit<BrotliOptions, BrotliDisallowOptionName>;

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
export function createCompress(options: BrotliDisallowedOptions) {
    const disallowOptionList = brotliDisallowOptionNameList.filter(optName => optName in options);
    if (disallowOptionList.length > 0) {
        throw new Error(`The following brotli compress options are not allowed: ${disallowOptionList.join(', ')}`);
    }
    return () => createBrotliCompress(options);
}

export { createBrotliDecompress as createDecompress };
