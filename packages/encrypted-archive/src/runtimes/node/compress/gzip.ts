import { createGunzip, createGzip } from 'zlib';

import type { GetOptions } from '../../../core/types/utils';
import { genCompressData, validateDisallowedOptions } from './utils';

const gzipDisallowOptionNameList = ['flush', 'finishFlush', 'dictionary', 'info', 'maxOutputLength'] as const;
type GzipDisallowOptionName = (typeof gzipDisallowOptionNameList)[number];
type GzipOptions = GetOptions<typeof createGzip>;
type GzipDisallowedOptions = Omit<GzipOptions, GzipDisallowOptionName>;

export const gzip = genCompressData<GzipDisallowedOptions>({
    validateCompressOptions: options =>
        validateDisallowedOptions(
            options,
            gzipDisallowOptionNameList,
            'The following gzip compress options are not allowed: %s',
        ),
    createCompress: createGzip,
    createDecompress: createGunzip,
});
