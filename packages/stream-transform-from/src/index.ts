import { Transform } from 'stream';

import { createSource, SourceResult } from './utils';

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

type TransformFunction<TOpts extends stream.TransformOptions> = (
    source: AsyncIterableIterator<InputChunkType<TOpts>>,
) => Iterable<OutputChunkType<TOpts>> | AsyncIterable<OutputChunkType<TOpts>>;

export class TransformFromAsyncIterable<
    TOpts extends Omit<stream.TransformOptions, 'transform' | 'flush'>
> extends Transform {
    private source: SourceResult<InputChunkType<TOpts>> | undefined;
    private done: stream.TransformCallback | undefined;

    constructor(
        private readonly transformFn: TransformFunction<TOpts>,
        opts?: TOpts,
    ) {
        super(opts);
    }

    _transform(
        chunk: InputChunkType<TOpts>,
        _encoding: BufferEncoding,
        callback: stream.TransformCallback,
    ): void {
        this.done = callback;
        this.getSource().emit(chunk);
    }

    _flush(callback: stream.TransformCallback): void {
        this.done = callback;
        this.getSource().end();
    }

    private getSource(): SourceResult<InputChunkType<TOpts>> {
        if (this.source) return this.source;

        const source = createSource<InputChunkType<TOpts>>();
        const result = this.transformFn(source.iterator);
        void (async () => {
            try {
                for await (const chunk of result) {
                    this.pushChunk(chunk);
                }
                if (this.done) this.done();
            } catch (error) {
                this.pushError(error);
            }
        })();

        return (this.source = source);
    }

    private pushChunk(chunk: OutputChunkType<TOpts>): void {
        if (this.done) {
            this.done(null, chunk);
        } else {
            this.push(chunk);
        }
    }

    private pushError(error: Error): void {
        if (this.done) {
            this.done(error);
        } else {
            this.destroy(error);
        }
    }
}

export function transformFrom<TOpts extends Omit<stream.TransformOptions, 'transform' | 'flush'>>(
    transformFn: TransformFunction<TOpts>,
    options?: TOpts,
): stream.Transform {
    return new TransformFromAsyncIterable(transformFn, options);
}
