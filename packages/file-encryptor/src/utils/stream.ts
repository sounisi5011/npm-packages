import { Transform } from 'stream';
import type * as stream from 'stream';
import { callbackify } from 'util';

import { printObject } from '.';

// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
export type StreamResult = Buffer | null | undefined | void;

export interface PromisifyTransform {
    // eslint-disable-next-line @typescript-eslint/method-signature-style
    flush?(): Promise<StreamResult>;
}

export abstract class PromisifyTransform extends Transform {
    protected abstract transform(chunk: unknown, encoding: BufferEncoding): Promise<StreamResult>;

    _transform(chunk: unknown, encoding: BufferEncoding, callback: stream.TransformCallback): void {
        callbackify(async () => await this.transform(chunk, encoding))(callback);
    }

    _flush(callback: stream.TransformCallback): void {
        if (this.flush) {
            const flush = this.flush.bind(this);
            callbackify(async () => await flush())(callback);
        } else {
            callback();
        }
    }
}

export class StreamReader {
    private streamIterator: AsyncIterableIterator<unknown> | undefined;
    private buffer: Buffer = Buffer.alloc(0);

    constructor(
        private readonly stream: NodeJS.ReadableStream,
        private readonly convertChunk = (chunk: unknown): Buffer | Uint8Array => {
            if (chunk instanceof Uint8Array || Buffer.isBuffer(chunk)) return chunk;
            if (typeof chunk === 'string') return Buffer.from(chunk);
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
            this.streamIterator = this.streamIterator ?? this.stream[Symbol.asyncIterator]();
            const result = await this.streamIterator.next();
            if (result.done) break;

            const chunk = this.convertChunk(result.value);
            // TODO: Buffer should not be merged every time a chunk is read.
            //       Each chunk should be stored in an array and merged only when the Buffer is returned.
            this.buffer = Buffer.concat([this.buffer, chunk]);
        }
        return this.buffer.subarray(offset, needByteLength);
    }

    async seek(offset: number): Promise<void> {
        await this.read(offset);
        this.buffer = this.buffer.subarray(offset);
    }

    async isEnd(): Promise<boolean> {
        await this.read(1);
        return this.buffer.byteLength < 1;
    }
}
