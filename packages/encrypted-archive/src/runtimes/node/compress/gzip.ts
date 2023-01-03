import { createGunzip, createGzip } from 'zlib';

import type { CompressData } from '../../../core/types/compress';
import type { GetOptions } from '../../../core/types/utils';
import { fixNodePrimordialsErrorStackTrace } from '../utils';
import { validateDisallowedOptions, writeFromIterableToStream } from './utils';

const gzipDisallowOptionNameList = ['flush', 'finishFlush', 'dictionary', 'info', 'maxOutputLength'] as const;
type GzipDisallowOptionName = (typeof gzipDisallowOptionNameList)[number];
type GzipOptions = GetOptions<typeof createGzip>;
type GzipDisallowedOptions = Omit<GzipOptions, GzipDisallowOptionName>;

export const gzip: CompressData<GzipDisallowedOptions> = {
    createCompress(options) {
        validateDisallowedOptions(
            options,
            gzipDisallowOptionNameList,
            'The following gzip compress options are not allowed: %s',
        );
        return async function*(source) {
            // Note: To prevent reuse of the Stream object, create it here.
            const compressStream = createGzip(options);
            try {
                yield* writeFromIterableToStream(source, compressStream);
            } catch (error) {
                fixNodePrimordialsErrorStackTrace(error);
            }
        };
    },
    async *decompress(source) {
        const decompressStream = createGunzip();
        try {
            yield* writeFromIterableToStream(source, decompressStream);
        } catch (error) {
            fixNodePrimordialsErrorStackTrace(error);
        }
    },
};
