import { promisify } from 'util';
import { brotliCompress, brotliDecompress, gunzip, gzip } from 'zlib';
import type * as zlib from 'zlib';

import { fixNodePrimordialsErrorStackTrace, printObject } from './utils';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);
const brotliCompressAsync = promisify(brotliCompress);
const brotliDecompressAsync = promisify(brotliDecompress);

const zlibDisallowOptionNameList = ['flush', 'finishFlush', 'dictionary', 'info'] as const;
type ZlibDisallowOptionName = (typeof zlibDisallowOptionNameList)[number];

export interface CompressGzipOptions extends Omit<zlib.ZlibOptions, ZlibDisallowOptionName> {
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

        const disallowOptionList = zlibDisallowOptionNameList.filter(optName => optName in zlibOptions);
        if (disallowOptionList.length > 0) {
            throw new Error(`The following compress options are not allowed: ${disallowOptionList.join(', ')}`);
        }

        return {
            algorithm,
            data: await gzipAsync(data, zlibOptions).catch(fixNodePrimordialsErrorStackTrace),
        };
    } else if (normalizedOptions.algorithm === 'brotli') {
        const { algorithm, ...brotliOptions } = normalizedOptions;
        return {
            algorithm,
            data: await brotliCompressAsync(data, brotliOptions).catch(fixNodePrimordialsErrorStackTrace),
        };
    }
    throw new TypeError(
        `Unknown compress algorithm was received: ${
            printObject(normalizedOptions.algorithm, { passThroughString: true })
        }`,
    );
}

export async function decompress(data: zlib.InputType, algorithm: CompressAlgorithmName): Promise<Buffer> {
    if (algorithm === 'gzip') {
        return await gunzipAsync(data).catch(fixNodePrimordialsErrorStackTrace);
    } else if (algorithm === 'brotli') {
        return await brotliDecompressAsync(data).catch(fixNodePrimordialsErrorStackTrace);
    }
    throw new TypeError(
        `Unknown compress algorithm was received: ${printObject(algorithm, { passThroughString: true })}`,
    );
}
