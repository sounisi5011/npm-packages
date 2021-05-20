import { Transform } from 'stream';

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

type InputData<TOpts extends stream.TransformOptions> =
    | { chunk: InputChunkType<TOpts>; done?: false }
    | { done: true };

export class TransformFromAsyncIterable<
    TOpts extends Omit<stream.TransformOptions, 'transform' | 'flush'>
> extends Transform {
    private done: stream.TransformCallback | undefined;
    private transformInput: ((data: InputData<TOpts>) => void) | undefined;

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
        this.setInput({ chunk });
    }

    _flush(callback: stream.TransformCallback): void {
        this.done = callback;
        this.setInput({ done: true });
    }

    private setInput(inputData: InputData<TOpts>): void {
        if (this.transformInput) {
            this.transformInput(inputData);
            return;
        }

        const source = this.createSource(inputData);
        const result = this.transformFn(source);
        void (async () => {
            try {
                for await (const chunk of result) {
                    this.pushChunk(chunk);
                }
            } catch (error) {
                this.pushError(error);
            }
        })();
    }

    private async *createSource(
        parentInputData: InputData<TOpts> | undefined,
    ): AsyncIterableIterator<InputChunkType<TOpts>> {
        while (true) {
            const inputPromise = new Promise<InputData<TOpts>>(resolve => {
                this.transformInput = resolve;
            });

            if (parentInputData) {
                const inputData = parentInputData;
                parentInputData = undefined;
                if (inputData.done) break;
                yield inputData.chunk;
            }

            const inputData = await inputPromise;
            if (inputData.done) break;
            yield inputData.chunk;
        }
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
