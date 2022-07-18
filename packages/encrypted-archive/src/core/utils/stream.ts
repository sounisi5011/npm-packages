import { isOneArray, uint8arrayConcat } from '.';
import type { BuiltinEncodeStringRecord, BuiltinInspectRecord } from '../types/builtin';
import type { AsyncIterableIteratorReturn, AsyncIterableReturn } from './type';

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
        builtin: BuiltinInspectRecord & BuiltinEncodeStringRecord,
        private readonly source: Iterable<unknown> | AsyncIterable<unknown>,
        private readonly convertChunk = (chunk: unknown): Uint8Array => {
            if (chunk instanceof Uint8Array) return chunk;
            if (typeof chunk === 'string') return builtin.encodeString(chunk);
            throw new TypeError(
                `Invalid type chunk received.`
                    + ` Each chunk must be of type string or an instance of Uint8Array.`
                    + ` Received: ${builtin.inspect(chunk)}`,
            );
        },
    ) {
    }

    async read(size: number, offset = 0): Promise<Uint8Array> {
        const needByteLength = offset + size;
        await this.readAndAppendChunks(needByteLength);
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
        this.consume(offset);

        for (
            const readChunks of [
                this.readAndConsumeStoredChunks.bind(this),
                this.readNewChunks.bind(this),
            ]
        ) {
            for await (const [data, remainder] of readChunks(requestedSize - readedSize)) {
                readedSize += data.byteLength;
                yield { data, requestedSize, offset, readedSize };
                if (remainder) this.appendChunk(remainder);
            }
        }

        yield { requestedSize, offset, readedSize };
    }

    async seek(offset: number): Promise<void> {
        await this.readAndAppendChunks(offset);
        this.consume(offset);
    }

    async isEnd(): Promise<boolean> {
        await this.readAndAppendChunks(1);
        return this.currentByteLength < 1;
    }

    private async readAndAppendChunks(needByteLength: number): Promise<void> {
        while (this.currentByteLength < needByteLength) {
            const chunk = await this.tryReadChunk();
            if (!chunk) break;
            this.appendChunk(chunk);
        }
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

        const range = this.getIndexContainsRange({ beginBytes: beginOffset, endBytes: endOffset });

        const mergeChunkList = this.chunkList.slice(range.begin.chunkIndex, range.end.chunkIndex + 1);
        const newChunk = isOneArray(mergeChunkList) ? mergeChunkList[0] : uint8arrayConcat(...mergeChunkList);

        const deleteCount = range.end.chunkIndex - range.begin.chunkIndex + 1;
        if (deleteCount > 1 && newChunk.byteLength !== 0) {
            this.chunkList.splice(range.begin.chunkIndex, deleteCount, newChunk);
        }

        return newChunk.subarray(
            range.begin.byteOffset,
            range.begin.byteOffset + (endOffset - beginOffset),
        );
    }

    private consume(bytes: number): void {
        const {
            begin: {
                chunkIndex: firstChunkIndex,
                byteOffset: beginOffsetInFirstChunk,
            },
        } = this.getIndexContainsRange({ beginBytes: bytes, endBytes: bytes });

        let deleteCount = firstChunkIndex;
        const firstChunk = this.chunkList[firstChunkIndex];
        if (firstChunk && beginOffsetInFirstChunk !== 0) {
            if (firstChunk.byteLength <= beginOffsetInFirstChunk) {
                deleteCount += 1;
            } else {
                this.chunkList[firstChunkIndex] = firstChunk.subarray(beginOffsetInFirstChunk);
            }
        }

        this.chunkList.splice(0, deleteCount);
        this.currentByteLength = this.chunkList
            .reduce((len, chunk) => len + chunk.byteLength, 0);
    }

    private *readAndConsumeStoredChunks(requestedSize: number): Iterable<[data: Uint8Array, remainder?: Uint8Array]> {
        let readedSize = 0;
        while (readedSize < requestedSize) {
            const firstChunk = this.chunkList[0];
            if (!firstChunk) break;
            this.chunkList.pop();
            this.currentByteLength -= firstChunk.byteLength;

            const bufferPair = this.splitBuffer(firstChunk, requestedSize - readedSize);
            const [data] = bufferPair;
            yield bufferPair;
            readedSize += data.byteLength;
        }
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

    private getIndexContainsRange(range: {
        readonly beginBytes: number;
        readonly endBytes: number;
    }): {
        begin: { chunkIndex: number; byteOffset: number };
        end: { chunkIndex: number; byteOffset: number };
    } {
        const beginBytes = Math.min(range.beginBytes, range.endBytes);
        const endBytes = Math.max(range.beginBytes, range.endBytes);
        const begin = { chunkIndex: 0, byteOffset: 0 };
        const end = { chunkIndex: 0, byteOffset: 0 };

        let readedSize = 0;
        for (const [index, chunk] of this.chunkList.entries()) {
            const { byteLength: chunkSize } = chunk;
            if (readedSize <= beginBytes) {
                begin.chunkIndex = index;
                begin.byteOffset = Math.min(beginBytes - readedSize, chunkSize);
            }
            if (readedSize < endBytes) {
                end.chunkIndex = index;
                end.byteOffset = Math.min(endBytes - readedSize, chunkSize);
            } else {
                break;
            }
            readedSize += chunkSize;
        }

        return { begin, end };
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
