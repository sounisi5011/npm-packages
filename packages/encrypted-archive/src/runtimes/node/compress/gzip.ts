import { createGunzip, createGzip } from 'zlib';

import type { GetOptions } from '../../../core/types/utils';
import { validateDisallowedOptions } from './utils';

const gzipDisallowOptionNameList = ['flush', 'finishFlush', 'dictionary', 'info', 'maxOutputLength'] as const;
type GzipDisallowOptionName = (typeof gzipDisallowOptionNameList)[number];
type GzipOptions = GetOptions<typeof createGzip>;
type GzipDisallowedOptions = Omit<GzipOptions, GzipDisallowOptionName>;

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function createCompress(options: GzipDisallowedOptions) {
    validateDisallowedOptions(
        options,
        gzipDisallowOptionNameList,
        'The following gzip compress options are not allowed: %s',
    );
    return () => createGzip(options);
}

export { createGunzip as createDecompress };
