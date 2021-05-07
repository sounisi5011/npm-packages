import { Transform } from 'stream';
import type * as stream from 'stream';
import { callbackify } from 'util';

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
