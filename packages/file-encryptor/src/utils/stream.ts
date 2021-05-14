import { once } from 'events';
import type * as stream from 'stream';

import { printObject } from '.';
import type { AsyncIterableIteratorReturn, AsyncIterableReturn } from './type';

/**
 * Writes a value of type `Iterable` to a writable stream object.
 * Inspired by the `stream.pipeline()` module method in Node.js v13.10.0 and later (which adds support for async generators).
 */
export function writeFromIterableToStream<TStream extends stream.Writable>(
    iterable: Iterable<unknown> | AsyncIterable<unknown>,
    stream: TStream,
): TStream {
    void (async () => {
        try {
            /**
             * @see https://github.com/nodejs/node/blob/v13.14.0/lib/internal/streams/pipeline.js#L132-L150
             * @see https://github.com/nodejs/node/blob/v14.17.0/lib/internal/streams/pipeline.js#L119-L141
             * @see https://github.com/nodejs/node/blob/v15.14.0/lib/internal/streams/pipeline.js#L105-L127
             * @see https://github.com/nodejs/node/blob/v16.1.0/lib/internal/streams/pipeline.js#L104-L126
             */
            // @ts-expect-error TS2339: Property 'writableNeedDrain' does not exist on type 'TStream'.
            // Note: The "writableNeedDrain" property was added in Node.js v14.17.0.
            if (stream.writableNeedDrain === true) {
                await once(stream, 'drain');
            }
            for await (const chunk of iterable) {
                if (!stream.write(chunk)) {
                    if (stream.destroyed) return;
                    await once(stream, 'drain');
                }
            }
            stream.end();
        } catch (error) {
            /**
             * @see https://github.com/nodejs/node/blob/v13.14.0/lib/internal/streams/destroy.js#L136-L142
             * @see https://github.com/nodejs/node/blob/v14.17.0/lib/internal/streams/destroy.js#L178-L183
             * @see https://github.com/nodejs/node/blob/v15.14.0/lib/internal/streams/destroy.js#L362-L367
             * @see https://github.com/nodejs/node/blob/v16.1.0/lib/internal/streams/destroy.js#L367-L372
             */
            stream.destroy(error);
        }
    })();
    return stream;
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
    private iterator: AsyncIterator<unknown> | undefined;
    private buffer: Buffer = Buffer.alloc(0);

    constructor(
        private readonly source: Iterable<unknown> | AsyncIterable<unknown>,
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
            const chunk = await this.tryReadChunk();
            if (!chunk) break;

            // TODO: Buffer should not be merged every time a chunk is read.
            //       Each chunk should be stored in an array and merged only when the Buffer is returned.
            this.buffer = Buffer.concat([this.buffer, chunk]);
        }
        return this.buffer.subarray(offset, needByteLength);
    }

    async *readIterator(
        size: number,
        offset = 0,
    ): AsyncIterableIteratorReturn<
        { data?: Buffer; requestedSize: number; offset: number; readedSize: number },
        void
    > {
        const requestedSize = size;
        let readedSize = 0;

        if (readedSize < requestedSize && this.buffer.byteLength > 0) {
            const [data, remainder] = this.splitBuffer(this.buffer, requestedSize, offset, true);
            readedSize += data.byteLength;
            yield { data, requestedSize, offset, readedSize };
            this.buffer = remainder;
        }

        for await (const [data, remainder] of this.readNewChunks(requestedSize - readedSize)) {
            readedSize += data.byteLength;
            yield { data, requestedSize, offset, readedSize };
            if (remainder) this.buffer = remainder;
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

    private async tryReadChunk(): Promise<Buffer | undefined> {
        this.iterator = this.iterator ?? this.toAsyncIterator(this.source);
        const result = await this.iterator.next();
        if (result.done) return undefined;
        return this.convertChunk(result.value);
    }

    private async *readNewChunks(requestedSize: number): AsyncIterableReturn<[Buffer, Buffer?], void> {
        let readedSize = 0;
        while (readedSize < requestedSize) {
            const chunk = await this.tryReadChunk();
            if (!chunk) break;

            const [data, remainder] = this.splitBuffer(chunk, requestedSize - readedSize);
            yield [data, remainder];
            readedSize += data.byteLength;
        }
    }

    private splitBuffer(
        buffer: Buffer,
        size: number,
        offset: number | undefined,
        alwaysReturnTwoBuffer: true,
    ): [Buffer, Buffer];
    private splitBuffer(
        buffer: Buffer,
        size: number,
        offset?: number,
        alwaysReturnTwoBuffer?: false,
    ): [Buffer, Buffer?];
    private splitBuffer(buffer: Buffer, size: number, offset = 0, alwaysReturnTwoBuffer = false): [Buffer, Buffer?] {
        const endOffset = offset + size;
        if (buffer.byteLength <= endOffset) {
            const firstBuffer = offset < 1 ? buffer : buffer.subarray(offset);
            return alwaysReturnTwoBuffer ? [firstBuffer, Buffer.alloc(0)] : [firstBuffer];
        }
        return [
            buffer.subarray(offset, endOffset),
            buffer.subarray(endOffset),
        ];
    }

    private async *toAsyncIterator<T>(source: Iterable<T> | AsyncIterable<T>): AsyncIterator<T> {
        yield* source;
    }
}
