import { version as nodeVersion } from 'process';
import { Transform } from 'stream';
import type * as stream from 'stream';

type GetPropValue<T, K extends PropertyKey> = K extends (keyof T) ? T[K] : undefined;

type IfNeverThenUnknown<T> = [T] extends [never] ? unknown : T;

/**
 * If the `objectMode` and `writableObjectMode` options is not `true`,
 * the chunk value is always an instance of Buffer.
 */
export type InputChunkType<T extends stream.TransformOptions> = (
    true extends GetPropValue<T, 'objectMode' | 'writableObjectMode'> ? unknown : Buffer
);

/**
 * If the `objectMode` and `readableObjectMode` options is not `true`,
 * the chunk value must be of type string or an instance of Buffer or Uint8Array.
 * @see https://github.com/nodejs/node/blob/v12.17.0/lib/_stream_readable.js#L226-L244
 */
export type OutputChunkType<T extends stream.TransformOptions> = IfNeverThenUnknown<
    T extends ({ objectMode: true } | { readableObjectMode: true }) ? never
        : string | Buffer | Uint8Array
>;

export type SourceIterator<TOpts extends stream.TransformOptions> = (
    AsyncIterableIterator<{
        chunk: InputChunkType<TOpts>;
        encoding: BufferEncoding;
    }>
);

export type TransformFunction<TOpts extends stream.TransformOptions> = (
    (source: SourceIterator<TOpts>) =>
        | Iterable<OutputChunkType<TOpts>>
        | AsyncIterable<OutputChunkType<TOpts>>
);

type ReceivedData<TOpts extends stream.TransformOptions> =
    | { chunk: InputChunkType<TOpts>; encoding: BufferEncoding; done?: false }
    | { done: true };

/**
 * Prior to Node.js v14, there is a bug where the `finish` event is fired before the callback passed to the `transform._flush()` method is called.
 * This bug has been fixed in Node.js v15.
 * @see https://github.com/nodejs/node/issues/34274
 * @see https://github.com/nodejs/node/pull/34314
 */
const HAS_FLUSH_BUG = !(Number(nodeVersion.match(/(?<=^v)\d+/)?.[0]) >= 15);

const DISALLOW_OPTION_NAMES = [
    'construct',
    'read',
    'write',
    'writev',
    'final',
    'destroy',
    'transform',
    'flush',
] as const;

function removeProp<T>(obj: T, props: readonly never[]): T;
function removeProp<T, K extends PropertyKey>(
    obj: T | undefined,
    props: readonly K[],
): Omit<T, K> | undefined;
function removeProp<T, K extends PropertyKey>(
    obj: T | null,
    props: readonly K[],
): Omit<T, K> | null;
function removeProp<T, K extends PropertyKey>(
    obj: T | null | undefined,
    props: readonly K[],
): Omit<T, K> | null | undefined;
function removeProp(
    obj: Record<PropertyKey, unknown> | null | undefined,
    props: readonly PropertyKey[],
): Record<PropertyKey, unknown> | null | undefined {
    if (obj === null || obj === undefined) return obj;
    return Object.fromEntries(
        Object.entries(obj)
            .filter(([p]) => !props.includes(p)),
    );
}

export class TransformFromAsyncIterable<
    TOpts extends stream.TransformOptions = Record<string, never>
> extends Transform {
    private transformCallback: stream.TransformCallback | undefined;
    private isFinished = false;
    private receiveData?: ((data: ReceivedData<TOpts>) => void) | undefined;
    private readonly receivedDataList: Array<ReceivedData<TOpts>> = [];

    constructor(transformFn: TransformFunction<TOpts>, opts?: TOpts) {
        super(removeProp(opts, DISALLOW_OPTION_NAMES));

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

    override _transform(
        chunk: InputChunkType<TOpts>,
        encoding: BufferEncoding,
        callback: stream.TransformCallback,
    ): void {
        if (this.isFinished) {
            callback();
        } else {
            this.transformCallback = callback;
            this.emitToSource({ chunk, encoding });
        }
    }

    override _flush(callback: stream.TransformCallback): void {
        if (this.isFinished) {
            callback();
        } else {
            this.transformCallback = HAS_FLUSH_BUG
                ? this.emitFinishEventAfterCallback(callback)
                : callback;
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

    private callTransformCallback(
        ...args: Parameters<stream.TransformCallback>
    ): boolean {
        const { transformCallback } = this;
        if (transformCallback) {
            this.transformCallback = undefined;
            transformCallback(...args);
            return true;
        }
        return false;
    }

    private async *createSource(): SourceIterator<TOpts> {
        while (true) {
            const data: ReceivedData<TOpts> = (
                this.receivedDataList.shift()
                    ?? await new Promise(resolve => {
                        this.receiveData = resolve;
                        this.callTransformCallback();
                    })
            );
            if (data.done) break;
            const { done: _, ...chunkData } = data;
            yield chunkData;
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

    private emitFinishEventAfterCallback(
        flushCallback: stream.TransformCallback,
    ): stream.TransformCallback {
        const finishEventName = 'finish';
        const finishEventList: unknown[][] = [];

        this.emit = (event: string | symbol, ...args: unknown[]) => {
            if (finishEventName === event) {
                finishEventList.push(args);
                return false;
            }
            return super.emit(event, ...args);
        };

        return (...args) => {
            flushCallback(...args);

            // @ts-expect-error TS2790: The operand of a 'delete' operator must be optional.
            delete this.emit;

            const [error] = args;
            if (!error) {
                for (const args of finishEventList) {
                    this.emit(finishEventName, ...args);
                }
            }
        };
    }
}

export function transformFrom<
    TOpts extends stream.TransformOptions = Record<string, never>
>(
    transformFn: TransformFunction<TOpts>,
    options?: TOpts,
): stream.Transform {
    return new TransformFromAsyncIterable(transformFn, options);
}
