import type * as stream from 'stream';

/**
 * If the `objectMode` and `writableObjectMode` options is not `true`,
 * the chunk value is always an instance of Buffer.
 */
type InputChunkType<T extends stream.TransformOptions> = (
    T extends ({ objectMode: true } | { writableObjectMode: true }) ? unknown
        : Buffer
);

/**
 * If the `objectMode` and `readableObjectMode` options is not `true`,
 * the chunk value must be of type string or an instance of Buffer or Uint8Array.
 * @see https://github.com/nodejs/node/blob/v12.17.0/lib/_stream_readable.js#L226-L244
 */
type OutputChunkType<T extends stream.TransformOptions> = (
    T extends ({ objectMode: true } | { readableObjectMode: true }) ? unknown
        : string | Buffer | Uint8Array
);

export function transformFrom<TOpts extends stream.TransformOptions>(
    transformFn: (
        source: AsyncIterableIterator<InputChunkType<TOpts>>,
    ) => Iterable<OutputChunkType<TOpts>> | AsyncIterable<OutputChunkType<TOpts>>,
    options?: TOpts,
): stream.Transform {
    // TODO
}
