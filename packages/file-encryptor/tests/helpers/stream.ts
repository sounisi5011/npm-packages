import * as stream from 'stream';
import { promisify } from 'util';

export const waitStreamFinished = promisify(stream.finished);
export const pipelineAsync = promisify(stream.pipeline);

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
