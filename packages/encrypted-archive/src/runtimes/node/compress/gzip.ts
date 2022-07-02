import { createGunzip, createGzip } from 'zlib';

import { GzipDisallowedOptions, gzipDisallowOptionNameList } from '../../../core/types/compress';
import { validateDisallowedOptions } from './utils';

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
