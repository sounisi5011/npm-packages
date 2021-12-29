import BufferListStream from 'bl';

import { printObject } from '.';
import type { AsyncIterableIteratorReturn, AsyncIterableReturn } from '../types/utils';

export interface StreamReaderInterface<T extends Uint8Array = Uint8Array> {
    read: (size: number, offset?: number) => Promise<T>;
    readIterator: (
        size: number,
        offset?: number,
    ) => AsyncIterable<{ data?: T | undefined; requestedSize: number; offset: number; readedSize: number }>;
    seek: (offset: number) => Promise<void>;
    isEnd: () => Promise<boolean>;
}

export class StreamReader implements StreamReaderInterface<Uint8Array> {
    private iterator: AsyncIterator<unknown> | undefined;
    private readonly bufferList = new BufferListStream();

    constructor(
        private readonly source: Iterable<unknown> | AsyncIterable<unknown>,
        private readonly convertChunk = (chunk: unknown): Uint8Array => {
            if (chunk instanceof Uint8Array) return chunk;
            throw new TypeError(
                `Invalid type chunk received.`
                    + ` Each chunk must be an instance of Uint8Array.`
                    + ` Received: ${printObject(chunk)}`,
            );
        },
    ) {
    }

    async read(size: number, offset = 0): Promise<Uint8Array> {
        const needByteLength = offset + size;
        while (this.bufferList.length < needByteLength) {
            const chunk = await this.tryReadChunk();
            if (!chunk) break;

            this.bufferList.append(chunk);
        }
        return this.bufferList.slice(offset, needByteLength);
    }

    async *readIterator(
        size: number,
        offset = 0,
    ): AsyncIterableIteratorReturn<
        { data?: Uint8Array; requestedSize: number; offset: number; readedSize: number },
        void
    > {
        const requestedSize = size;
        let readedSize = 0;

        if (readedSize < requestedSize && this.bufferList.length > 0) {
            const endOffset = offset + requestedSize;
            const data = this.bufferList.slice(offset, endOffset);
            readedSize += data.byteLength;
            yield { data, requestedSize, offset, readedSize };
            this.bufferList.consume(endOffset);
        }

        for await (const [data, remainder] of this.readNewChunks(requestedSize - readedSize)) {
            readedSize += data.byteLength;
            yield { data, requestedSize, offset, readedSize };
            if (remainder) this.bufferList.append(remainder);
        }

        yield { requestedSize, offset, readedSize };
    }

    async seek(offset: number): Promise<void> {
        if (this.bufferList.length < offset) await this.read(offset);
        this.bufferList.consume(offset);
    }

    async isEnd(): Promise<boolean> {
        if (this.bufferList.length < 1) await this.read(1);
        return this.bufferList.length < 1;
    }

    private async tryReadChunk(): Promise<Uint8Array | undefined> {
        this.iterator = this.iterator ?? this.toAsyncIterator(this.source);
        const result = await this.iterator.next();
        if (result.done) return undefined;
        return this.convertChunk(result.value);
    }

    private async *readNewChunks(requestedSize: number): AsyncIterableReturn<[Uint8Array, Uint8Array?], void> {
        let readedSize = 0;
        while (readedSize < requestedSize) {
            const chunk = await this.tryReadChunk();
            if (!chunk) break;

            const bufferPair = this.splitBuffer(chunk, requestedSize - readedSize);
            const [data] = bufferPair;

            yield bufferPair;
            readedSize += data.byteLength;
        }
    }

    private splitBuffer(buffer: Uint8Array, size: number, offset = 0): [Uint8Array, Uint8Array?] {
        const endOffset = offset + size;
        if (buffer.byteLength <= endOffset) {
            const firstBuffer = offset < 1 ? buffer : buffer.subarray(offset);
            return [firstBuffer];
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