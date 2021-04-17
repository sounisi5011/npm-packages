import { promisify } from 'util';
import { brotliCompress, brotliDecompress, gunzip, gzip } from 'zlib';
import type * as zlib from 'zlib';

import { fixNodePrimordialsErrorStackTrace } from './utils';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);
const brotliCompressAsync = promisify(brotliCompress);
const brotliDecompressAsync = promisify(brotliDecompress);

export interface CompressGzipOptions extends Omit<zlib.ZlibOptions, 'info'> {
    algorithm: 'gzip';
}

export interface CompressBrotliOptions extends zlib.BrotliOptions {
    algorithm: 'brotli';
}

export type CompressOptions = CompressGzipOptions | CompressBrotliOptions;
export type CompressAlgorithmName = CompressOptions['algorithm'];
export type CompressOptionsWithString = CompressOptions | CompressAlgorithmName;

export async function compress(
    data: zlib.InputType,
    options: CompressOptionsWithString,
): Promise<{ algorithm: CompressAlgorithmName; data: Buffer }> {
    const normalizedOptions = typeof options === 'string' ? { algorithm: options } : options;
    if (normalizedOptions.algorithm === 'gzip') {
        const { algorithm, ...zlibOptions } = normalizedOptions;
        const normalizedZlibOptions: zlib.ZlibOptions = {
            ...zlibOptions,
            // The "info" option is always disabled.
            // Because the return value will not be a Buffer object.
            info: false,
        };
        return {
            algorithm,
            data: await gzipAsync(data, normalizedZlibOptions).catch(fixNodePrimordialsErrorStackTrace),
        };
    } else if (normalizedOptions.algorithm === 'brotli') {
        const { algorithm, ...brotliOptions } = normalizedOptions;
        return {
            algorithm,
            data: await brotliCompressAsync(data, brotliOptions).catch(fixNodePrimordialsErrorStackTrace),
        };
    }
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    throw new TypeError(`Unknown compress algorithm was received: ${normalizedOptions.algorithm}`);
}

export async function decompress(data: zlib.InputType, algorithm: CompressAlgorithmName): Promise<Buffer> {
    if (algorithm === 'gzip') {
        return await gunzipAsync(data).catch(fixNodePrimordialsErrorStackTrace);
    } else if (algorithm === 'brotli') {
        return await brotliDecompressAsync(data).catch(fixNodePrimordialsErrorStackTrace);
    }
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    throw new TypeError(`Unknown compress algorithm was received: ${algorithm}`);
}
