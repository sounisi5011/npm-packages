import * as stream from 'stream';
import { promisify } from 'util';

import { TransformFromAsyncIterable, TransformFunction } from '../src';
import { createOutputWritable } from './helpers';

describe('inherited classes', () => {
    it('overwrite incoming chunks', async () => {
        const data = [0, 1, 2, 3];
        const outputData = [1, 2, 3, 4];

        class Increment extends TransformFromAsyncIterable<{ objectMode: true }> {
            constructor(f: TransformFunction<{ objectMode: true }>) {
                super(f, { objectMode: true });
            }

            _transform(chunk: unknown, encoding: BufferEncoding, callback: stream.TransformCallback): void {
                super._transform(
                    typeof chunk === 'number' ? chunk + 1 : chunk,
                    encoding,
                    callback,
                );
            }
        }

        const outputChunkList: unknown[] = [];
        await promisify(stream.pipeline)(
            stream.Readable.from(data),
            new Increment(async function*(source) {
                yield* source;
            }),
            createOutputWritable(outputChunkList),
        );
        expect(outputChunkList).toStrictEqual(outputData);
    });
});
