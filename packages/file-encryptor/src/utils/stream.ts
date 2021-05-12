import { pipeline, Transform } from 'stream';
import type * as stream from 'stream';
import { callbackify } from 'util';

import { printObject } from '.';

export function pipelineWithoutCallback<T extends NodeJS.WritableStream>(
    ...streams: [NodeJS.ReadableStream, ...NodeJS.ReadableStream[], T]
): T {
    return pipeline(streams, () => {
        //
    }) as T;
}

// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
export type StreamResult = Buffer | null | undefined | void;

export interface PromisifyTransform {
    // eslint-disable-next-line @typescript-eslint/method-signature-style
    flush?(): Promise<StreamResult>;
}

export abstract class PromisifyTransform extends Transform {
    protected abstract transform(chunk: unknown, encoding: BufferEncoding): Promise<StreamResult>;

    _transform(chunk: unknown, encoding: BufferEncoding, callback: stream.TransformCallback): void {
        callbackify(async () => await this.transform(chunk, encoding))(callback);
    }

    _flush(callback: stream.TransformCallback): void {
        if (this.flush) {
            const flush = this.flush.bind(this);
            callbackify(async () => await flush())(callback);
        } else {
            callback();
        }
    }
}

export interface StreamReaderInterface<T extends Buffer | Uint8Array = Buffer | Uint8Array> {
    read: (size: number, offset?: number) => Promise<T>;
    readIterator: (
        size: number,
        offset?: number,
    ) => AsyncIterable<{ data?: T; requestedSize: number; offset: number; readedSize: number }>;
    seek: (offset: number) => Promise<void>;
    isEnd: () => Promise<boolean>;
}

export class StreamReader implements StreamReaderInterface<Buffer> {
    private streamIterator: AsyncIterableIterator<unknown> | undefined;
    private buffer: Buffer = Buffer.alloc(0);

    constructor(
        private readonly stream: NodeJS.ReadableStream,
        private readonly convertChunk = (chunk: unknown): Buffer => {
            if (Buffer.isBuffer(chunk)) return chunk;
            if (typeof chunk === 'string' || chunk instanceof Uint8Array) return Buffer.from(chunk);
            throw new TypeError(
                `Invalid type chunk received.`
                    + ` Each chunk must be of type string or an instance of Buffer or Uint8Array.`
                    + ` Received: ${printObject(chunk)}`,
            );
        },
    ) {
    }

    async read(size: number, offset = 0): Promise<Buffer> {
        const needByteLength = offset + size;
        while (this.buffer.byteLength < needByteLength) {
            this.streamIterator = this.streamIterator ?? this.stream[Symbol.asyncIterator]();
            const result = await this.streamIterator.next();
            if (result.done) break;

            const chunk = this.convertChunk(result.value);
            // TODO: Buffer should not be merged every time a chunk is read.
            //       Each chunk should be stored in an array and merged only when the Buffer is returned.
            this.buffer = Buffer.concat([this.buffer, chunk]);
        }
        return this.buffer.subarray(offset, needByteLength);
    }

    async *readIterator(
        size: number,
        offset = 0,
    ): AsyncGenerator<{ data?: Buffer; requestedSize: number; offset: number; readedSize: number }, void, void> {
        const requestedSize = size;
        let readedSize = 0;

        if (this.buffer.byteLength > 0) {
            const needByteLength = offset + requestedSize;

            const data = this.buffer.subarray(offset, needByteLength);
            readedSize += data.byteLength;
            yield { data, requestedSize, offset, readedSize };

            this.buffer = this.buffer.subarray(needByteLength);
        }

        while (readedSize < requestedSize) {
            this.streamIterator = this.streamIterator ?? this.stream[Symbol.asyncIterator]();
            const result = await this.streamIterator.next();
            if (result.done) break;
            const chunk = this.convertChunk(result.value);

            const needByteLength = requestedSize - readedSize;
            if (chunk.byteLength < needByteLength) {
                readedSize += chunk.byteLength;
                yield { data: chunk, requestedSize, offset, readedSize };
            } else {
                const data = chunk.subarray(0, needByteLength);
                readedSize += data.byteLength;
                yield { data, requestedSize, offset, readedSize };

                this.buffer = chunk.subarray(needByteLength);
                break;
            }
        }

        yield { requestedSize, offset, readedSize };
    }

    async seek(offset: number): Promise<void> {
        await this.read(offset);
        this.buffer = this.buffer.subarray(offset);
    }

    async isEnd(): Promise<boolean> {
        await this.read(1);
        return this.buffer.byteLength < 1;
    }
}
