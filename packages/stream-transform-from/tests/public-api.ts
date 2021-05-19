import * as stream from 'stream';
import { promisify } from 'util';

async function createPipeline(
    opts: {
        readableInput: Iterable<unknown> | AsyncIterable<unknown> | (() => Iterable<unknown> | AsyncIterable<unknown>);
        transform: stream.Transform;
        writable?: stream.Writable;
    },
): Promise<void> {
    const readableInput = typeof opts.readableInput === 'function' ? opts.readableInput() : opts.readableInput;
    return opts.writable
        ? await promisify(stream.pipeline)(
            stream.Readable.from(readableInput),
            opts.transform,
            opts.writable,
        )
        : await promisify(stream.pipeline)(
            stream.Readable.from(readableInput),
            opts.transform,
        );
}

function createNoopWritable(opts?: Omit<stream.WritableOptions, 'write'>): stream.Writable {
    return new stream.Writable({
        ...opts,
        write(_chunk, _, done) {
            done();
        },
    });
}

function createOutputWritable(
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

describe('passes though chunks', () => {
    const data = ['first', 'second', 'third'];
    const outputData = data.map(str => Buffer.from(str));

    it.each<[string, stream.Transform]>([
        [
            'builtin Transform',
            new stream.Transform({
                transform(chunk, encoding, done) {
                    this.push(chunk, encoding);
                    done();
                },
            }),
        ],
    ])('%s', async (_, transform) => {
        const outputChunkList: unknown[] = [];
        await createPipeline({
            readableInput: data,
            transform,
            writable: createOutputWritable(outputChunkList),
        });
        expect(outputChunkList).toStrictEqual(outputData);
    });
});

describe('transforms chunks', () => {
    const data = ['first', 'second', 'third'];
    const outputData = data.map(str => Buffer.from(`(${str})`));

    it.each<[string, stream.Transform]>([
        [
            'builtin Transform',
            new stream.Transform({
                transform(chunk, _encoding, done) {
                    this.push(Buffer.concat([
                        Buffer.from('('),
                        chunk,
                        Buffer.from(')'),
                    ]));
                    done();
                },
            }),
        ],
    ])('%s', async (_, transform) => {
        const outputChunkList: unknown[] = [];
        await createPipeline({
            readableInput: data,
            transform,
            writable: createOutputWritable(outputChunkList),
        });
        expect(outputChunkList).toStrictEqual(outputData);
    });
});

describe('passes through objects', () => {
    const data = [{ name: 'first' }, { name: 'second' }, { name: 'third' }];

    it.each<[string, stream.Transform]>([
        [
            'builtin Transform',
            new stream.Transform({
                transform(obj, _encoding, done) {
                    this.push(obj);
                    done();
                },
                objectMode: true,
            }),
        ],
    ])('%s', async (_, transform) => {
        const outputChunkList: unknown[] = [];
        await createPipeline({
            readableInput: data,
            transform,
            writable: createOutputWritable(outputChunkList, { objectMode: true }),
        });
        expect(outputChunkList).toStrictEqual(data);
    });
});

describe('transforms objects', () => {
    const data = [{ name: 'first' }, { name: 'second' }, { name: 'third' }];
    const outputData = [['first'], ['second'], ['third']];

    it.each<[string, stream.Transform]>([
        [
            'builtin Transform',
            new stream.Transform({
                transform(obj, _encoding, done) {
                    this.push([obj.name]);
                    done();
                },
                objectMode: true,
            }),
        ],
    ])('%s', async (_, transform) => {
        const outputChunkList: unknown[] = [];
        await createPipeline({
            readableInput: data,
            transform,
            writable: createOutputWritable(outputChunkList, { objectMode: true }),
        });
        expect(outputChunkList).toStrictEqual(outputData);
    });
});

describe('throw error from Readable', () => {
    describe.each<[string, stream.Transform]>([
        [
            'builtin Transform',
            new stream.Transform({
                transform(chunk, encoding, done) {
                    this.push(chunk, encoding);
                    done();
                },
            }),
        ],
    ])('%s', (_, transform) => {
        const readableInput = function*(): Iterable<unknown> {
            yield '';
            throw new Error('foo');
        };

        it.each<[string, Promise<void>]>([
            [
                'pipe to WritableStream',
                createPipeline({
                    readableInput,
                    transform,
                    writable: createNoopWritable(),
                }),
            ],
            [
                'not pipe to WritableStream',
                createPipeline({
                    readableInput,
                    transform,
                }),
            ],
        ])('%s', async (_, resultPromise) => {
            await expect(resultPromise).rejects.toThrow(Error);
            await expect(resultPromise).rejects.toThrow(/^foo$/);
        });
    });
});

describe('throw error from Transform', () => {
    describe.each<[string, stream.Transform]>([
        [
            'builtin Transform',
            new stream.Transform({
                transform(_chunk, _encoding, done) {
                    done(new Error('bar'));
                },
            }),
        ],
    ])('%s', (_, transform) => {
        const readableInput = [''];

        it.each<[string, Promise<void>]>([
            [
                'pipe to WritableStream',
                createPipeline({
                    readableInput,
                    transform,
                    writable: createNoopWritable(),
                }),
            ],
            [
                'not pipe to WritableStream',
                createPipeline({
                    readableInput,
                    transform,
                }),
            ],
        ])('%s', async (_, resultPromise) => {
            await expect(resultPromise).rejects.toThrow(Error);
            await expect(resultPromise).rejects.toThrow(/^bar$/);
        });
    });
});

describe('can return non-buffer value', () => {
    describe.each<[string, stream.Transform]>([
        [
            'builtin Transform / only readableObjectMode=true',
            new stream.Transform({
                transform(_chunk, _encoding, done) {
                    this.push(42);
                    done();
                },
                objectMode: false,
                readableObjectMode: true,
                writableObjectMode: false,
            }),
        ],
        [
            'builtin Transform / readableObjectMode=true writableObjectMode=true',
            new stream.Transform({
                transform(_chunk, _encoding, done) {
                    this.push(42);
                    done();
                },
                objectMode: false,
                readableObjectMode: true,
                writableObjectMode: true,
            }),
        ],
        [
            'builtin Transform / only objectMode=true',
            new stream.Transform({
                transform(_chunk, _encoding, done) {
                    this.push(42);
                    done();
                },
                objectMode: true,
                readableObjectMode: false,
                writableObjectMode: false,
            }),
        ],
        [
            'builtin Transform / objectMode=true readableObjectMode=true',
            new stream.Transform({
                transform(_chunk, _encoding, done) {
                    this.push(42);
                    done();
                },
                objectMode: true,
                readableObjectMode: true,
                writableObjectMode: false,
            }),
        ],
        [
            'builtin Transform / objectMode=true writableObjectMode=true',
            new stream.Transform({
                transform(_chunk, _encoding, done) {
                    this.push(42);
                    done();
                },
                objectMode: true,
                readableObjectMode: false,
                writableObjectMode: true,
            }),
        ],
        [
            'builtin Transform / all true',
            new stream.Transform({
                transform(_chunk, _encoding, done) {
                    this.push(42);
                    done();
                },
                objectMode: true,
                readableObjectMode: true,
                writableObjectMode: true,
            }),
        ],
    ])('%s', (_, transform) => {
        const readableInput = [''];

        it.each<[string, Promise<void>]>([
            [
                'pipe to WritableStream',
                createPipeline({
                    readableInput,
                    transform,
                    writable: createNoopWritable({ objectMode: true }),
                }),
            ],
            [
                'not pipe to WritableStream',
                createPipeline({
                    readableInput,
                    transform,
                }),
            ],
        ])('%s', async (_, resultPromise) => {
            await expect(resultPromise).resolves.not.toThrow();
        });
    });
});

describe('can not return non-buffer value', () => {
    describe.each<[string, stream.Transform]>([
        [
            'builtin Transform / all false',
            new stream.Transform({
                transform(_chunk, _encoding, done) {
                    this.push(42);
                    done();
                },
                objectMode: false,
                readableObjectMode: false,
                writableObjectMode: false,
            }),
        ],
        [
            'builtin Transform / only writableObjectMode=true',
            new stream.Transform({
                transform(_chunk, _encoding, done) {
                    this.push(42);
                    done();
                },
                objectMode: false,
                readableObjectMode: false,
                writableObjectMode: true,
            }),
        ],
    ])('%s', (_, transform) => {
        const readableInput = [''];

        it.each<[string, Promise<void>]>([
            [
                'pipe to WritableStream',
                createPipeline({
                    readableInput,
                    transform,
                    writable: createNoopWritable({ objectMode: true }),
                }),
            ],
            [
                'not pipe to WritableStream',
                createPipeline({
                    readableInput,
                    transform,
                }),
            ],
        ])('%s', async (_, resultPromise) => {
            await expect(resultPromise).rejects.toThrow(
                /^The "chunk" argument must be of type string or an instance of Buffer or Uint8Array\. Received type number \(42\)$/,
            );
        });
    });
});
