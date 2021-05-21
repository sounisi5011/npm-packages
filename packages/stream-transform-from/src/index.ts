import { Transform } from 'stream';

import type * as stream from 'stream';

type GetPropValue<T, K extends PropertyKey> = K extends (keyof T) ? T[K] : undefined;

/**
 * If the `objectMode` and `writableObjectMode` options is not `true`,
 * the chunk value is always an instance of Buffer.
 */
export type InputChunkType<T extends stream.TransformOptions> = (
    true extends (GetPropValue<T, 'objectMode'> | GetPropValue<T, 'writableObjectMode'>) ? unknown : Buffer
);

type IfNeverThenUnknown<T> = [T] extends [never] ? unknown : T;

/**
 * If the `objectMode` and `readableObjectMode` options is not `true`,
 * the chunk value must be of type string or an instance of Buffer or Uint8Array.
 * @see https://github.com/nodejs/node/blob/v12.17.0/lib/_stream_readable.js#L226-L244
 */
export type OutputChunkType<T extends stream.TransformOptions> = IfNeverThenUnknown<
    T extends ({ objectMode: true } | { readableObjectMode: true }) ? never
        : string | Buffer | Uint8Array
>;

export type TransformFunction<TOpts extends stream.TransformOptions> = (
    source: AsyncIterableIterator<InputChunkType<TOpts>>,
) => Iterable<OutputChunkType<TOpts>> | AsyncIterable<OutputChunkType<TOpts>>;

type ReceivedData<TOpts extends stream.TransformOptions> =
    | { chunk: InputChunkType<TOpts>; done?: false }
    | { done: true };

export class TransformFromAsyncIterable<
    TOpts extends Omit<stream.TransformOptions, 'transform' | 'flush'> = Record<string, never>
> extends Transform {
    private transformCallback: stream.TransformCallback | undefined;
    private isFinished = false;
    private receiveData?: (data: ReceivedData<TOpts>) => void;
    private readonly receivedDataList: Array<ReceivedData<TOpts>> = [];

    constructor(transformFn: TransformFunction<TOpts>, opts?: TOpts) {
        super(opts);

        const source = this.createSource();
        const result = transformFn(source);
        (async () => {
            for await (const chunk of result) {
                this.push(chunk);
            }
        })()
            .then(() => this.finish())
            .catch(error => this.finish(error));
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
            this.emitToSource({ chunk });
        }
    }

    _flush(callback: stream.TransformCallback): void {
        if (this.isFinished) {
            callback();
        } else {
            this.transformCallback = callback;
            this.emitToSource({ done: true });
        }
    }

    private finish(error?: Error): void {
        this.isFinished = true;
        if (error) {
            if (!this.callTransformCallback(error)) {
                this.destroy(error);
            }
        } else {
            this.push(null);
            this.callTransformCallback();
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

    private async *createSource(): AsyncIterableIterator<InputChunkType<TOpts>> {
        while (true) {
            const data = this.receivedDataList.shift() ?? await new Promise<ReceivedData<TOpts>>(resolve => {
                this.receiveData = resolve;
                this.callTransformCallback();
            });
            if (data.done) break;
            yield data.chunk;
        }
    }

    private emitToSource(data: ReceivedData<TOpts>): void {
        const { receiveData } = this;
        if (receiveData) {
            this.receiveData = undefined;
            receiveData(data);
        } else {
            this.receivedDataList.push(data);
        }
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
