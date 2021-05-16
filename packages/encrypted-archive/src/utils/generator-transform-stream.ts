/**
 * This file is a copy of the wonderful generator-transform-stream package.
 * The original generator-transform-stream could not be used in this project because it only supports ES Modules.
 * @see https://github.com/bealearts/generator-transform-stream/tree/v1.0.1
 */

import { PassThrough, Readable, ReadableOptions, TransformOptions } from 'stream';

import duplexify from 'duplexify';

/**
 * If the `objectMode` option is not `true`,
 * the chunk value must be of type string or an instance of Buffer or Uint8Array.
 * @see https://github.com/nodejs/node/blob/v12.3.0/lib/_stream_readable.js#L305-L313
 */
type ChunkType<T extends ReadableOptions> = (
    T extends { objectMode: true } ? unknown
        : string | Buffer | Uint8Array
);

export default function gts<T extends TransformOptions>(
    func: (inputStream: PassThrough) => Iterable<ChunkType<T>> | AsyncIterable<ChunkType<T>>,
    options?: T,
): duplexify.Duplexify {
    const inputStream = new PassThrough({
        ...options,
    });

    const outputStream = Readable.from(func(inputStream), { objectMode: false, ...options });

    const transformStream = duplexify(inputStream, outputStream, { ...options });

    return transformStream;
}
