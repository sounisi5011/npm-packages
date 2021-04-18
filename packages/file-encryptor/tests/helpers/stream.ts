import { Readable } from 'stream';

export function createCountStream(chunkCount: number): Readable {
    const generate = function*(): Generator<Buffer> {
        for (let i = 0; i < chunkCount; i++) {
            yield Buffer.from([i]);
        }
    };
    // eslint-disable-next-line node/no-unsupported-features/node-builtins
    return Readable.from(generate());
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
