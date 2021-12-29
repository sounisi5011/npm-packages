import * as stream from 'stream';
import { promisify } from 'util';

import type { AsyncIterableIteratorReturn } from '../../src/core/types/utils';
import type { StreamReaderInterface } from '../../src/core/utils/stream';

export const waitStreamFinished = promisify(stream.finished);
export const pipelineAsync = promisify(stream.pipeline);

export function createFillBytesReadableStream(
    { size: fullLength, value = 0x00 }: { size: number; value?: string | number | Buffer },
): stream.Readable {
    let sendByteLength = 0;

    return new stream.Readable({
        read(readLength) {
            if (fullLength <= (sendByteLength + readLength)) readLength = fullLength - sendByteLength;

            this.push(Buffer.alloc(readLength, value));
            sendByteLength += readLength;

            if (fullLength <= sendByteLength) this.push(null);
        },
    });
}

export function createCountStream(chunkCount: number): stream.Readable {
    // eslint-disable-next-line node/no-unsupported-features/node-builtins
    return stream.Readable.from((function*() {
        for (let i = 0; i < chunkCount; i++) {
            yield Buffer.from([i]);
        }
    })());
}

export function createChunkerStream({ chunkSize }: { chunkSize: number }): stream.Transform {
    let allChunk = Buffer.alloc(0);
    return new stream.Transform({
        transform(chunk, _, done) {
            allChunk = Buffer.concat([allChunk, chunk]);
            while (chunkSize <= allChunk.byteLength) {
                this.push(allChunk.subarray(0, chunkSize));
                allChunk = allChunk.subarray(chunkSize);
            }
            done();
        },
        flush(done) {
            if (allChunk.byteLength > 0) {
                this.push(allChunk);
            }
            done();
        },
    });
}

export function createStreamFromArrayBufferView(view: ArrayBufferView, highWaterMark = Infinity): stream.Readable {
    // eslint-disable-next-line node/no-unsupported-features/node-builtins
    return stream.Readable.from((function*(): Iterable<Buffer> {
        let i = 0;
        while (i < view.byteLength) {
            const length = Math.min(highWaterMark, view.byteLength - i);
            yield Buffer.from(view.buffer, view.byteOffset + i, length);
            i += length;
        }
    })());
}

export class DummyStreamReader implements StreamReaderInterface<Uint8Array> {
    constructor(private data: Uint8Array) {}

    async read(size: number, offset = 0): Promise<Uint8Array> {
        const needByteLength = offset + size;
        return this.data.subarray(offset, needByteLength);
    }

    async *readIterator(
        size: number,
        offset = 0,
    ): AsyncIterableIteratorReturn<
        { data?: Uint8Array; requestedSize: number; offset: number; readedSize: number },
        void
    > {
        const data = await this.read(size, offset);
        if (data.byteLength > 0) {
            yield { data, requestedSize: size, offset, readedSize: data.byteLength };
            await this.seek(offset + data.byteLength);
        }
        yield { requestedSize: size, offset, readedSize: data.byteLength };
    }

    async seek(offset: number): Promise<void> {
        this.data = this.data.subarray(offset);
    }

    async isEnd(): Promise<boolean> {
        return this.data.byteLength < 1;
    }
}
