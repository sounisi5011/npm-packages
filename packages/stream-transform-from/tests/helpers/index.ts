import * as stream from 'stream';

export function assertType<T>(_: T): void {
    //
}

export function createNoopWritable(opts?: Omit<stream.WritableOptions, 'write'>): stream.Writable {
    return new stream.Writable({
        ...opts,
        write(_chunk, _, done) {
            done();
        },
    });
}

export function createOutputWritable(
    outputChunkList: unknown[],
    opts?: Omit<stream.WritableOptions, 'write'>,
): stream.Writable {
    return new stream.Writable({
        ...opts,
        write(chunk, _, done) {
            outputChunkList.push(chunk);
            done();
        },
    });
}
