import * as stream from 'stream';
import { promisify } from 'util';

import type { StreamReaderInterface } from '../../src/utils/stream';

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
    const generate = function*(): Generator<Buffer> {
        for (let i = 0; i < chunkCount; i++) {
            yield Buffer.from([i]);
        }
    };
    // eslint-disable-next-line node/no-unsupported-features/node-builtins
    return stream.Readable.from(generate());
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

export function createStreamFromBuffer(buf: Buffer, highWaterMark = Infinity): stream.Readable {
    const generate = function*(): Generator<Buffer> {
        let i = 0;
        while (i < buf.byteLength) {
            yield buf.subarray(i, i += highWaterMark);
        }
    };
    // eslint-disable-next-line node/no-unsupported-features/node-builtins
    return stream.Readable.from(generate());
}

export class DummyStreamReader implements StreamReaderInterface<Buffer> {
    constructor(private data: Buffer) {}

    async read(size: number, offset = 0): Promise<Buffer> {
        const needByteLength = offset + size;
        return this.data.subarray(offset, needByteLength);
    }

    async *readIterator(
        size: number,
        offset = 0,
    ): AsyncGenerator<{ data?: Buffer; requestedSize: number; offset: number; readedSize: number }, void, void> {
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
