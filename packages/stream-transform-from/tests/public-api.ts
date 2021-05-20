import * as stream from 'stream';
import { promisify } from 'util';

import { transformFrom } from '../src';

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
        [
            'transformFrom()',
            transformFrom(async function*(source) {
                yield* source;
            }),
        ],
    ])('%s', async (_, transform) => {
        const outputChunkList: unknown[] = [];
        await promisify(stream.pipeline)(
            stream.Readable.from(data),
            transform,
            createOutputWritable(outputChunkList),
        );
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
        [
            'transformFrom()',
            transformFrom(async function*(source) {
                for await (const chunk of source) {
                    yield Buffer.concat([
                        Buffer.from('('),
                        chunk,
                        Buffer.from(')'),
                    ]);
                }
            }),
        ],
    ])('%s', async (_, transform) => {
        const outputChunkList: unknown[] = [];
        await promisify(stream.pipeline)(
            stream.Readable.from(data),
            transform,
            createOutputWritable(outputChunkList),
        );
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
        [
            'transformFrom()',
            transformFrom(
                async function*(source) {
                    yield* source;
                },
                { objectMode: true },
            ),
        ],
    ])('%s', async (_, transform) => {
        const outputChunkList: unknown[] = [];
        await promisify(stream.pipeline)(
            stream.Readable.from(data),
            transform,
            createOutputWritable(outputChunkList, { objectMode: true }),
        );
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
        [
            'transformFrom()',
            transformFrom(
                async function*(source) {
                    // eslint-disable-next-line @typescript-eslint/ban-types
                    function hasProp<T extends PropertyKey>(obj: object, propName: T): obj is Record<T, unknown> {
                        return propName in obj;
                    }
                    function validateChunk(chunk: unknown): chunk is { name: string } {
                        if (typeof chunk !== 'object' || chunk === null) return false;
                        if (!hasProp(chunk, 'name')) return false;
                        return typeof chunk.name === 'string';
                    }

                    for await (const obj of source) {
                        if (!validateChunk(obj)) {
                            throw new Error('Invalid chunk!');
                        }
                        yield [obj.name];
                    }
                },
                { objectMode: true },
            ),
        ],
    ])('%s', async (_, transform) => {
        const outputChunkList: unknown[] = [];
        await promisify(stream.pipeline)(
            stream.Readable.from(data),
            transform,
            createOutputWritable(outputChunkList, { objectMode: true }),
        );
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
        [
            'transformFrom()',
            transformFrom(async function*(source) {
                yield* source;
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
                promisify(stream.pipeline)(
                    stream.Readable.from(readableInput()),
                    transform,
                    createNoopWritable(),
                ),
            ],
            [
                'not pipe to WritableStream',
                promisify(stream.pipeline)(
                    stream.Readable.from(readableInput()),
                    transform,
                ),
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
        [
            'transformFrom()',
            // eslint-disable-next-line require-yield
            transformFrom(async function*() {
                throw new Error('bar');
            }),
        ],
    ])('%s', (_, transform) => {
        const data = [''];

        it.each<[string, Promise<void>]>([
            [
                'pipe to WritableStream',
                promisify(stream.pipeline)(
                    stream.Readable.from(data),
                    transform,
                    createNoopWritable(),
                ),
            ],
            [
                'not pipe to WritableStream',
                promisify(stream.pipeline)(
                    stream.Readable.from(data),
                    transform,
                ),
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
            'transformFrom() / only readableObjectMode=true',
            transformFrom(
                async function*() {
                    yield 42;
                },
                {
                    objectMode: false,
                    readableObjectMode: true,
                    writableObjectMode: false,
                },
            ),
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
            'transformFrom() / readableObjectMode=true writableObjectMode=true',
            transformFrom(
                async function*() {
                    yield 42;
                },
                {
                    objectMode: false,
                    readableObjectMode: true,
                    writableObjectMode: true,
                },
            ),
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
            'transformFrom() / only objectMode=true',
            transformFrom(
                async function*() {
                    yield 42;
                },
                {
                    objectMode: true,
                    readableObjectMode: false,
                    writableObjectMode: false,
                },
            ),
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
            'transformFrom() / objectMode=true readableObjectMode=true',
            transformFrom(
                async function*() {
                    yield 42;
                },
                {
                    objectMode: true,
                    readableObjectMode: true,
                    writableObjectMode: false,
                },
            ),
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
            'transformFrom() / objectMode=true writableObjectMode=true',
            transformFrom(
                async function*() {
                    yield 42;
                },
                {
                    objectMode: true,
                    readableObjectMode: false,
                    writableObjectMode: true,
                },
            ),
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
        [
            'transformFrom() / all true',
            transformFrom(
                async function*() {
                    yield 42;
                },
                {
                    objectMode: true,
                    readableObjectMode: true,
                    writableObjectMode: true,
                },
            ),
        ],
    ])('%s', (_, transform) => {
        const data = [''];

        it.each<[string, Promise<void>]>([
            [
                'pipe to WritableStream',
                promisify(stream.pipeline)(
                    stream.Readable.from(data),
                    transform,
                    createNoopWritable({ objectMode: true }),
                ),
            ],
            [
                'not pipe to WritableStream',
                promisify(stream.pipeline)(
                    stream.Readable.from(data),
                    transform,
                ),
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
            'transformFrom() / all false',
            transformFrom(
                // @ts-expect-error TS2345: Argument of type '() => AsyncGenerator<number, void, any>' is not assignable to parameter of type '(source: AsyncIterableIterator<unknown>) => Iterable<string | Buffer | Uint8Array> | AsyncIterable<string | Buffer | Uint8Array>'.
                async function*() {
                    yield 42;
                },
                {
                    objectMode: false,
                    readableObjectMode: false,
                    writableObjectMode: false,
                },
            ),
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
        [
            'transformFrom() / only writableObjectMode=true',
            transformFrom(
                // @ts-expect-error TS2345: Argument of type '() => AsyncGenerator<number, void, any>' is not assignable to parameter of type '(source: AsyncIterableIterator<unknown>) => Iterable<string | Buffer | Uint8Array> | AsyncIterable<string | Buffer | Uint8Array>'.
                async function*() {
                    yield 42;
                },
                {
                    objectMode: false,
                    readableObjectMode: false,
                    writableObjectMode: true,
                },
            ),
        ],
    ])('%s', (_, transform) => {
        const data = [''];

        it.each<[string, Promise<void>]>([
            [
                'pipe to WritableStream',
                promisify(stream.pipeline)(
                    stream.Readable.from(data),
                    transform,
                    createNoopWritable({ objectMode: true }),
                ),
            ],
            [
                'not pipe to WritableStream',
                promisify(stream.pipeline)(
                    stream.Readable.from(data),
                    transform,
                ),
            ],
        ])('%s', async (_, resultPromise) => {
            await expect(resultPromise).rejects.toThrow(
                /^The "chunk" argument must be of type string or an instance of Buffer or Uint8Array\. Received type number \(42\)$/,
            );
        });
    });
});
