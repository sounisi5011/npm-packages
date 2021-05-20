import { Transform } from 'stream';

import { createSource, SourceResult } from './utils';

import type * as stream from 'stream';

type GetPropValue<T, K extends PropertyKey> = K extends (keyof T) ? T[K] : undefined;

/**
 * If the `objectMode` and `writableObjectMode` options is not `true`,
 * the chunk value is always an instance of Buffer.
 */
type InputChunkType<T extends stream.TransformOptions> = (
    true extends (GetPropValue<T, 'objectMode'> | GetPropValue<T, 'writableObjectMode'>) ? unknown : Buffer
);

type IfNeverThenUnknown<T> = [T] extends [never] ? unknown : T;

/**
 * If the `objectMode` and `readableObjectMode` options is not `true`,
 * the chunk value must be of type string or an instance of Buffer or Uint8Array.
 * @see https://github.com/nodejs/node/blob/v12.17.0/lib/_stream_readable.js#L226-L244
 */
type OutputChunkType<T extends stream.TransformOptions> = IfNeverThenUnknown<
    T extends ({ objectMode: true } | { readableObjectMode: true }) ? never
        : string | Buffer | Uint8Array
>;

type TransformFunction<TOpts extends stream.TransformOptions> = (
    source: AsyncIterableIterator<InputChunkType<TOpts>>,
) => Iterable<OutputChunkType<TOpts>> | AsyncIterable<OutputChunkType<TOpts>>;

export class TransformFromAsyncIterable<
    TOpts extends Omit<stream.TransformOptions, 'transform' | 'flush'> = Record<string, never>
> extends Transform {
    private source: SourceResult<InputChunkType<TOpts>> | undefined;
    private transformCallback: stream.TransformCallback | undefined;
    private isFinished = false;

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
        if (this.isFinished) {
            callback();
        } else {
            this.transformCallback = callback;
            this.getSource().emit(chunk);
        }
    }

    _flush(callback: stream.TransformCallback): void {
        if (this.isFinished) {
            callback();
        } else {
            this.transformCallback = callback;
            this.getSource().end();
        }
    }

    private getSource(): SourceResult<InputChunkType<TOpts>> {
        if (this.source) return this.source;

        const source = createSource<InputChunkType<TOpts>>(
            this.callTransformCallback.bind(this),
        );
        const result = this.transformFn(source.iterator);
        (async () => {
            for await (const chunk of result) {
                this.push(chunk);
            }
        })()
            .then(() => this.finish())
            .catch(error => this.finish(error));

        return (this.source = source);
    }

    private finish(error?: Error): void {
        this.isFinished = true;
        if (error) {
            if (!this.callTransformCallback(error)) {
                this.destroy(error);
            }
        } else {
            if (!this.callTransformCallback(null, null)) {
                this.push(null);
            }
        }
    }

    private callTransformCallback(...args: Parameters<stream.TransformCallback>): boolean {
        const { transformCallback } = this;
        if (transformCallback) {
            this.transformCallback = undefined;
            transformCallback(...args);
            return true;
        }
        return false;
    }
}

export function transformFrom<
    TOpts extends Omit<stream.TransformOptions, 'transform' | 'flush'> = Record<string, never>
>(
    transformFn: TransformFunction<TOpts>,
    options?: TOpts,
): stream.Transform {
    return new TransformFromAsyncIterable(transformFn, options);
}
