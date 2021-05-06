import { Readable, Transform } from 'stream';

export function createCountStream(chunkCount: number): Readable {
    const generate = function*(): Generator<Buffer> {
        for (let i = 0; i < chunkCount; i++) {
            yield Buffer.from([i]);
        }
    };
    // eslint-disable-next-line node/no-unsupported-features/node-builtins
    return Readable.from(generate());
}

export function createChunkerStream({ chunkSize }: { chunkSize: number }): Transform {
    let allChunk = Buffer.alloc(0);
    return new Transform({
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

export function createStreamFromBuffer(buf: Buffer, highWaterMark = Infinity): Readable {
    const generate = function*(): Generator<Buffer> {
        let i = 0;
        while (i < buf.byteLength) {
            yield buf.subarray(i, i += highWaterMark);
        }
    };
    // eslint-disable-next-line node/no-unsupported-features/node-builtins
    return Readable.from(generate());
}
