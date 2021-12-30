import { isOneArray, uint8arrayConcat } from '.';
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
    private readonly chunkList: Uint8Array[] = [];
    private currentByteLength = 0;

    constructor(
        private readonly source: Iterable<unknown> | AsyncIterable<unknown>,
        private readonly convertChunk = (chunk: unknown): Uint8Array => {
            if (chunk instanceof Uint8Array) return chunk;
            throw new TypeError('Invalid type chunk received. Each chunk must be an instance of Uint8Array.');
        },
    ) {
    }

    async read(size: number, offset = 0): Promise<Uint8Array> {
        const needByteLength = offset + size;
        while (this.currentByteLength < needByteLength) {
            const chunk = await this.tryReadChunk();
            if (!chunk) break;

            this.appendChunk(chunk);
        }
        return this.subarray(offset, needByteLength);
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

        if (readedSize < requestedSize && this.currentByteLength > 0) {
            const endOffset = offset + requestedSize;
            const data = this.subarray(offset, endOffset);
            readedSize += data.byteLength;
            yield { data, requestedSize, offset, readedSize };
            this.consume(endOffset);
        }

        for await (const [data, remainder] of this.readNewChunks(requestedSize - readedSize)) {
            readedSize += data.byteLength;
            yield { data, requestedSize, offset, readedSize };
            if (remainder) this.appendChunk(remainder);
        }

        yield { requestedSize, offset, readedSize };
    }

    async seek(offset: number): Promise<void> {
        if (this.currentByteLength < offset) await this.read(offset);
        this.consume(offset);
    }

    async isEnd(): Promise<boolean> {
        if (this.currentByteLength < 1) await this.read(1);
        return this.currentByteLength < 1;
    }

    private appendChunk(chunk: Uint8Array): void {
        if (chunk.byteLength < 1) return;
        this.chunkList.push(chunk);
        this.currentByteLength += chunk.byteLength;
    }

    private subarray(beginOffset: number, endOffset: number): Uint8Array {
        if (isOneArray(this.chunkList)) {
            const firstChunk = this.chunkList[0];
            return firstChunk.subarray(beginOffset, endOffset);
        }

        const { index: chunkListIndex, beginOffset: beginOffsetInChunk } = getIndexContainsRange(this.chunkList, {
            begin: beginOffset,
            end: endOffset,
        });
        const endOffsetInChunk = beginOffsetInChunk + (endOffset - beginOffset);

        const mergeChunkList = this.chunkList.slice(chunkListIndex.begin, chunkListIndex.end + 1);
        const newChunk = isOneArray(mergeChunkList) ? mergeChunkList[0] : uint8arrayConcat(...mergeChunkList);

        const deleteCount = chunkListIndex.end - chunkListIndex.begin + 1;
        if (deleteCount > 1 && newChunk.byteLength !== 0) {
            this.chunkList.splice(chunkListIndex.begin, deleteCount, newChunk);
        }

        return newChunk.subarray(beginOffsetInChunk, endOffsetInChunk);
    }

    private consume(bytes: number): void {
        const { index: { begin: firstChunkIndex }, beginOffset: beginOffsetInFirstChunk } = getIndexContainsRange(
            this.chunkList,
            { begin: bytes, end: bytes },
        );

        let deleteCount = firstChunkIndex;
        const firstChunk = this.chunkList[firstChunkIndex];
        if (firstChunk && beginOffsetInFirstChunk !== 0) {
            const newFirstChunk = firstChunk.subarray(beginOffsetInFirstChunk);
            if (newFirstChunk.byteLength === 0) {
                deleteCount += 1;
            } else {
                this.chunkList[firstChunkIndex] = newFirstChunk;
            }
        }

        this.chunkList.splice(0, deleteCount);
        this.currentByteLength = this.chunkList
            .reduce((len, chunk) => len + chunk.byteLength, 0);
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

/**
 * @private
 */
export function getIndexContainsRange(
    arrayLikeList: ReadonlyArray<ArrayLike<number>>,
    range: { begin: number; end: number },
): {
    index: {
        begin: number;
        end: number;
    };
    beginOffset: number;
} {
    const { result } = arrayLikeList.reduce(({ totalLength, result }, arrayLike, index) => {
        if (totalLength <= range.begin) {
            result.index.begin = index;
            result.beginOffset = range.begin - totalLength;
        }
        if (totalLength < range.end) {
            result.index.end = index;
        }
        return {
            totalLength: totalLength + arrayLike.length,
            result,
        };
    }, {
        totalLength: 0,
        result: {
            index: {
                begin: 0,
                end: 0,
            },
            beginOffset: 0,
        },
    });
    return result;
}
