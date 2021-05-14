import { once } from 'events';
import type * as stream from 'stream';

import { isOneArray, printObject } from '.';
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
    private readonly chunkList: Buffer[] = [];

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
        const { chunkList } = this;
        const needByteLength = offset + size;

        let readedByteLength = 0;
        for (const chunk of chunkList) {
            readedByteLength += chunk.byteLength;
        }

        while (readedByteLength < needByteLength) {
            const chunk = await this.tryReadChunk();
            if (!chunk) break;
            chunkList.push(chunk);
            readedByteLength += chunk.byteLength;
        }

        const bufferList = this.readFromChunkList(chunkList, { offset, size });

        // The `Buffer.concat()` function will always copy the Buffer object.
        // However, if the length of the array is 1, there is no need to copy it.
        return isOneArray(bufferList) ? bufferList[0] : Buffer.concat(bufferList);
    }

    async *readIterator(
        size: number,
        offset = 0,
    ): AsyncIterableIteratorReturn<
        { data?: Buffer; requestedSize: number; offset: number; readedSize: number },
        void
    > {
        const { chunkList } = this;
        const requestedSize = size;
        let readedSize = 0;

        if (readedSize < requestedSize && chunkList.length > 0) {
            for (const data of this.readFromChunkList(chunkList, { offset, size: requestedSize })) {
                readedSize += data.byteLength;
                yield { data, requestedSize, offset, readedSize };
            }

            const remainder = this.readFromChunkList(chunkList, { offset: offset + requestedSize, size: Infinity });
            chunkList.splice(0, Infinity, ...remainder);
        }

        for await (const [data, remainder] of this.readNewChunks(requestedSize - readedSize)) {
            readedSize += data.byteLength;
            yield { data, requestedSize, offset, readedSize };
            if (remainder) chunkList.push(remainder);
        }

        yield { requestedSize, offset, readedSize };
    }

    async seek(offset: number): Promise<void> {
        const { chunkList } = this;
        const remainderOffset = this.seekChunkList(chunkList, offset);
        const newChunk = await this.seekNewChunks(remainderOffset);
        if (newChunk) chunkList.push(newChunk);
    }

    async isEnd(): Promise<boolean> {
        await this.read(1);
        return this.chunkList.length < 1;
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

    private async seekNewChunks(offset: number): Promise<Buffer | null> {
        while (offset > 0) {
            const chunk = await this.tryReadChunk();
            if (!chunk) break;

            const { byteLength } = chunk;
            if (offset < byteLength) {
                return chunk.subarray(offset);
            }
            offset -= byteLength;
        }
        return null;
    }

    private readFromChunkList(
        chunkList: readonly Buffer[],
        { offset, size }: { offset: number; size: number },
    ): Buffer[] {
        const bufferList: Buffer[] = [];
        const needByteLength = offset + size;
        let readedSize = 0;

        if (size < 1) return [];

        for (const chunk of chunkList) {
            if (needByteLength <= readedSize) break;

            const { byteLength } = chunk;

            const bigin = offset - readedSize;
            const needSize = needByteLength - readedSize;
            if (bigin < 1 && byteLength <= needSize) {
                bufferList.push(chunk);
            } else if (bigin < 1) {
                bufferList.push(chunk.subarray(0, needSize));
            } else if (bigin < byteLength) {
                bufferList.push(chunk.subarray(bigin, needSize));
            }

            readedSize += byteLength;
        }

        return bufferList;
    }

    /**
     * Delete a Buffer from the `chunkList` array up to the position specified by `offset`.
     * If `offset` is in the middle of the last Buffer, the last Buffer is cropped and inserted into the `chunkList`.
     * @returns If offset is in the middle of the last Buffer, the last Buffer is cropped and inserted into the chunkList.
     */
    private seekChunkList(chunkList: Buffer[], offset: number): number {
        while (offset > 0) {
            const firstChunk = chunkList[0];
            if (!firstChunk) break;

            const { byteLength } = firstChunk;
            if (byteLength <= offset) {
                chunkList.shift();
            } else {
                chunkList[0] = firstChunk.subarray(offset);
            }
            offset -= byteLength;
        }
        return offset;
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
