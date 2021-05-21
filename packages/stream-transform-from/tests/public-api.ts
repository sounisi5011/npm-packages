import * as stream from 'stream';
import { promisify } from 'util';

import { transformFrom } from '../src';

function assertType<T>(_: T): void {
    //
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

    it.each<[string, () => stream.Transform]>([
        [
            'builtin Transform',
            () =>
                new stream.Transform({
                    transform(chunk, encoding, done) {
                        this.push(chunk, encoding);
                        done();
                    },
                }),
        ],
        [
            'transformFrom()',
            () =>
                transformFrom(async function*(source) {
                    yield* source;
                }),
        ],
    ])('%s', async (_, createTransform) => {
        const outputChunkList: unknown[] = [];
        await promisify(stream.pipeline)(
            stream.Readable.from(data),
            createTransform(),
            createOutputWritable(outputChunkList),
        );
        expect(outputChunkList).toStrictEqual(outputData);
    });
});

describe('transforms chunks', () => {
    const data = ['first', 'second', 'third'];
    const outputData = data.map(str => Buffer.from(`(${str})`));

    it.each<[string, () => stream.Transform]>([
        [
            'builtin Transform',
            () =>
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
            () =>
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
    ])('%s', async (_, createTransform) => {
        const outputChunkList: unknown[] = [];
        await promisify(stream.pipeline)(
            stream.Readable.from(data),
            createTransform(),
            createOutputWritable(outputChunkList),
        );
        expect(outputChunkList).toStrictEqual(outputData);
    });
});

describe('passes through objects', () => {
    const data = [{ name: 'first' }, { name: 'second' }, { name: 'third' }];

    it.each<[string, () => stream.Transform]>([
        [
            'builtin Transform',
            () =>
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
            () =>
                transformFrom(
                    async function*(source) {
                        yield* source;
                    },
                    { objectMode: true },
                ),
        ],
    ])('%s', async (_, createTransform) => {
        const outputChunkList: unknown[] = [];
        await promisify(stream.pipeline)(
            stream.Readable.from(data),
            createTransform(),
            createOutputWritable(outputChunkList, { objectMode: true }),
        );
        expect(outputChunkList).toStrictEqual(data);
    });
});

describe('transforms objects', () => {
    const data = [{ name: 'first' }, { name: 'second' }, { name: 'third' }];
    const outputData = [['first'], ['second'], ['third']];

    it.each<[string, () => stream.Transform]>([
        [
            'builtin Transform',
            () =>
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
            () =>
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
    ])('%s', async (_, createTransform) => {
        const outputChunkList: unknown[] = [];
        await promisify(stream.pipeline)(
            stream.Readable.from(data),
            createTransform(),
            createOutputWritable(outputChunkList, { objectMode: true }),
        );
        expect(outputChunkList).toStrictEqual(outputData);
    });
});

describe('split chunks', () => {
    const data = [
        'line1',
        'line2\nline3',
        '',
        'line4\n\nline5\n',
        '\nline6\n\n',
    ];
    const outputData = [
        Buffer.from('line1'),
        Buffer.from('line2'),
        Buffer.from('line3'),
        Buffer.from('line4'),
        Buffer.from('line5'),
        Buffer.from('line6'),
    ];

    it.each<[string, () => stream.Transform]>([
        [
            'builtin Transform',
            () =>
                new stream.Transform({
                    transform(chunk, _encoding, done) {
                        const lineList = (chunk.toString('utf8') as string)
                            .split(/\n+/)
                            .filter(line => line !== '');
                        for (const line of lineList) {
                            this.push(line);
                        }
                        done();
                    },
                }),
        ],
        [
            'transformFrom()',
            () =>
                transformFrom(async function*(source) {
                    for await (const chunk of source) {
                        const lineList = chunk.toString('utf8')
                            .split(/\n+/)
                            .filter(line => line !== '');
                        yield* lineList;
                    }
                }),
        ],
    ])('%s', async (_, createTransform) => {
        const outputChunkList: unknown[] = [];
        await promisify(stream.pipeline)(
            stream.Readable.from(data),
            createTransform(),
            createOutputWritable(outputChunkList),
        );
        expect(outputChunkList).toStrictEqual(outputData);
    });
});

describe('merge chunks', () => {
    const data = ['first', 'second', 'third'];
    const outputData = [Buffer.from(data.join('\n'))];

    it.each<[string, () => stream.Transform]>([
        [
            'builtin Transform',
            () => {
                const chunkList: Buffer[] = [];
                return new stream.Transform({
                    transform(chunk, _encoding, done) {
                        chunkList.push(chunk);
                        done();
                    },
                    flush(done) {
                        this.push(chunkList.join('\n'));
                        done();
                    },
                });
            },
        ],
        [
            'transformFrom()',
            () =>
                transformFrom(async function*(source) {
                    const chunkList: Buffer[] = [];
                    for await (const chunk of source) {
                        chunkList.push(chunk);
                    }
                    yield chunkList.join('\n');
                }),
        ],
    ])('%s', async (_, createTransform) => {
        const outputChunkList: unknown[] = [];
        await promisify(stream.pipeline)(
            stream.Readable.from(data),
            createTransform(),
            createOutputWritable(outputChunkList),
        );
        expect(outputChunkList).toStrictEqual(outputData);
    });
});

describe('break during transform', () => {
    const data = ['first', 'second', 'third', 'fourth', 'fifth'];
    const outputData = [Buffer.from('first'), Buffer.from('second'), Buffer.from('third')];

    it.each<[string, () => stream.Transform]>([
        [
            'builtin Transform',
            () => {
                let finished = false;
                return new stream.Transform({
                    transform(chunk, _encoding, done) {
                        if (!finished) {
                            this.push(chunk);
                        }
                        if (chunk.toString('utf8') === 'third') {
                            finished = true;
                        }
                        done();
                    },
                });
            },
        ],
        [
            'transformFrom()',
            () =>
                transformFrom(async function*(source) {
                    for await (const chunk of source) {
                        yield chunk;
                        if (chunk.toString('utf8') === 'third') {
                            break;
                        }
                    }
                }),
        ],
    ])('%s', async (_, createTransform) => {
        const outputChunkList: unknown[] = [];
        await promisify(stream.pipeline)(
            stream.Readable.from(data),
            createTransform(),
            createOutputWritable(outputChunkList),
        );
        expect(outputChunkList).toStrictEqual(outputData);
    });
});

describe('get data only when needed', () => {
    interface LogType {
        phase: number;
        chunk: string;
    }
    const data = ['first', 'second', 'third', 'fourth', 'fifth'];
    const outputData: readonly LogType[] = [
        { phase: -Infinity, chunk: 'first' },
        { phase: 1, chunk: 'first' },
        { phase: -Infinity, chunk: 'second' },
        { phase: -Infinity, chunk: 'third' },
        { phase: -Infinity, chunk: 'fourth' },
        { phase: -Infinity, chunk: 'fifth' },
        ...data.flatMap<LogType>((chunk, index) => {
            const nextChunk = data[index + 1];
            return nextChunk
                ? [
                    { phase: 2, chunk },
                    { phase: 1, chunk: nextChunk },
                    { phase: Infinity, chunk },
                ]
                : [
                    { phase: 2, chunk },
                    { phase: Infinity, chunk },
                ];
        }),
    ];

    it('builtin Transform', async () => {
        const loggerList: LogType[] = [];
        await promisify(stream.pipeline)(
            stream.Readable.from(data),
            new stream.Transform({
                transform(chunk, _encoding, done) {
                    loggerList.push({ phase: -Infinity, chunk: chunk.toString('utf8') });
                    done(null, chunk);
                },
            }),
            new stream.Transform({
                transform(chunk, _encoding, done) {
                    loggerList.push({ phase: 1, chunk: chunk.toString('utf8') });
                    setImmediate(() => {
                        done(null, chunk);
                    });
                },
            }),
            new stream.Transform({
                transform(chunk, _encoding, done) {
                    loggerList.push({ phase: 2, chunk: chunk.toString('utf8') });
                    setImmediate(() => {
                        done(null, chunk);
                    });
                },
            }),
            new stream.Writable({
                write(chunk, _, done) {
                    loggerList.push({ phase: Infinity, chunk: chunk.toString('utf8') });
                    done();
                },
            }),
        );
        expect(loggerList).toStrictEqual(outputData);
    });

    it('transformFrom()', async () => {
        const loggerList: LogType[] = [];
        await promisify(stream.pipeline)(
            stream.Readable.from(data),
            new stream.Transform({
                transform(chunk, _encoding, done) {
                    loggerList.push({ phase: -Infinity, chunk: chunk.toString('utf8') });
                    done(null, chunk);
                },
            }),
            transformFrom(async function*(source) {
                for await (const chunk of source) {
                    loggerList.push({ phase: 1, chunk: chunk.toString('utf8') });
                    yield chunk;
                }
            }),
            transformFrom(async function*(source) {
                for await (const chunk of source) {
                    loggerList.push({ phase: 2, chunk: chunk.toString('utf8') });
                    yield chunk;
                }
            }),
            new stream.Writable({
                write(chunk, _, done) {
                    loggerList.push({ phase: Infinity, chunk: chunk.toString('utf8') });
                    done();
                },
            }),
        );
        expect(loggerList).toStrictEqual(outputData);
    });
});

describe('throw error from Readable', () => {
    describe.each<[string, () => stream.Transform]>([
        [
            'builtin Transform',
            () =>
                new stream.Transform({
                    transform(chunk, encoding, done) {
                        this.push(chunk, encoding);
                        done();
                    },
                }),
        ],
        [
            'transformFrom()',
            () =>
                transformFrom(async function*(source) {
                    yield* source;
                }),
        ],
    ])('%s', (_, createTransform) => {
        const readableInput = function*(): Iterable<unknown> {
            yield '';
            throw new Error('foo');
        };

        it.each<[string, Promise<void>]>([
            [
                'pipe to WritableStream',
                promisify(stream.pipeline)(
                    stream.Readable.from(readableInput()),
                    createTransform(),
                    createNoopWritable(),
                ),
            ],
            [
                'not pipe to WritableStream',
                promisify(stream.pipeline)(
                    stream.Readable.from(readableInput()),
                    createTransform(),
                ),
            ],
        ])('%s', async (_, resultPromise) => {
            await expect(resultPromise).rejects.toThrow(Error);
            await expect(resultPromise).rejects.toThrow(/^foo$/);
        });
    });
});

describe('throw error from Transform', () => {
    describe.each<[string, () => stream.Transform]>([
        [
            'builtin Transform',
            () =>
                new stream.Transform({
                    transform(_chunk, _encoding, done) {
                        done(new Error('bar'));
                    },
                }),
        ],
        [
            'transformFrom()',
            () =>
                // eslint-disable-next-line require-yield
                transformFrom(async function*() {
                    throw new Error('bar');
                }),
        ],
    ])('%s', (_, createTransform) => {
        const data = [''];

        it.each<[string, Promise<void>]>([
            [
                'pipe to WritableStream',
                promisify(stream.pipeline)(
                    stream.Readable.from(data),
                    createTransform(),
                    createNoopWritable(),
                ),
            ],
            [
                'not pipe to WritableStream',
                promisify(stream.pipeline)(
                    stream.Readable.from(data),
                    createTransform(),
                ),
            ],
        ])('%s', async (_, resultPromise) => {
            await expect(resultPromise).rejects.toThrow(Error);
            await expect(resultPromise).rejects.toThrow(/^bar$/);
        });
    });
});

describe('source iterator contains only Buffer objects', () => {
    describe.each(
        [
            {},
            {
                objectMode: false,
                readableObjectMode: false,
                writableObjectMode: false,
            },
            {
                objectMode: false,
                readableObjectMode: true,
                writableObjectMode: false,
            },
        ] as const,
    )('options: %p', options => {
        const data = ['first', 'second', 'third'];

        it('builtin Transform', async () => {
            expect.assertions(data.length);
            await promisify(stream.pipeline)(
                stream.Readable.from(data),
                new stream.Transform({
                    transform(chunk, _encoding, done) {
                        expect(chunk).toBeInstanceOf(Buffer);
                        done(null, '');
                    },
                    ...options,
                }),
                createNoopWritable(),
            );
        });

        it('transformFrom()', async () => {
            expect.assertions(data.length);
            await promisify(stream.pipeline)(
                stream.Readable.from(data),
                transformFrom(
                    async function*(source) {
                        for await (const chunk of source) {
                            assertType<Buffer>(chunk);
                            expect(chunk).toBeInstanceOf(Buffer);
                            yield '';
                        }
                    },
                    options,
                ),
                createNoopWritable(),
            );
        });
    });
});

describe('source iterator contains more than just Buffer objects', () => {
    describe.each(
        [
            {
                objectMode: false,
                readableObjectMode: false,
                writableObjectMode: true,
            },
            {
                objectMode: false,
                readableObjectMode: true,
                writableObjectMode: true,
            },
            {
                objectMode: true,
                readableObjectMode: false,
                writableObjectMode: false,
            },
            {
                objectMode: true,
                readableObjectMode: true,
                writableObjectMode: false,
            },
            {
                objectMode: true,
                readableObjectMode: false,
                writableObjectMode: true,
            },
            {
                objectMode: true,
                readableObjectMode: true,
                writableObjectMode: true,
            },
        ] as const,
    )('options: %p', options => {
        const data = ['first', 'second', 'third'];

        it('builtin Transform', async () => {
            expect.assertions(data.length);
            await promisify(stream.pipeline)(
                stream.Readable.from(data),
                new stream.Transform({
                    transform(chunk, _encoding, done) {
                        expect(chunk).not.toBeInstanceOf(Buffer);
                        done(null, '');
                    },
                    ...options,
                }),
                createNoopWritable(),
            );
        });

        it('transformFrom()', async () => {
            expect.assertions(data.length);
            await promisify(stream.pipeline)(
                stream.Readable.from(data),
                transformFrom(
                    async function*(source) {
                        for await (const chunk of source) {
                            // @ts-expect-error TS2345: Argument of type 'unknown' is not assignable to parameter of type 'Buffer'.
                            assertType<Buffer>(chunk);
                            expect(chunk).not.toBeInstanceOf(Buffer);
                            yield '';
                        }
                    },
                    options,
                ),
                createNoopWritable(),
            );
        });
    });
});

describe('can return non-buffer value', () => {
    describe.each(
        [
            {
                objectMode: false,
                readableObjectMode: true,
                writableObjectMode: false,
            },
            {
                objectMode: false,
                readableObjectMode: true,
                writableObjectMode: true,
            },
            {
                objectMode: true,
                readableObjectMode: false,
                writableObjectMode: false,
            },
            {
                objectMode: true,
                readableObjectMode: true,
                writableObjectMode: false,
            },
            {
                objectMode: true,
                readableObjectMode: false,
                writableObjectMode: true,
            },
            {
                objectMode: true,
                readableObjectMode: true,
                writableObjectMode: true,
            },
        ] as const,
    )('options: %p', options => {
        describe.each<[string, () => stream.Transform]>([
            [
                'builtin Transform',
                () =>
                    new stream.Transform({
                        transform(_chunk, _encoding, done) {
                            this.push(42);
                            done();
                        },
                        ...options,
                    }),
            ],
            [
                'transformFrom()',
                () =>
                    transformFrom(
                        async function*() {
                            yield 42;
                        },
                        options,
                    ),
            ],
        ])('%s', (_, createTransform) => {
            const data = [''];

            it.each<[string, Promise<void>]>([
                [
                    'pipe to WritableStream',
                    promisify(stream.pipeline)(
                        stream.Readable.from(data),
                        createTransform(),
                        createNoopWritable({ objectMode: true }),
                    ),
                ],
                [
                    'not pipe to WritableStream',
                    promisify(stream.pipeline)(
                        stream.Readable.from(data),
                        createTransform(),
                    ),
                ],
            ])('%s', async (_, resultPromise) => {
                await expect(resultPromise).resolves.not.toThrow();
            });
        });
    });
});

describe('can not return non-buffer value', () => {
    describe.each(
        [
            {},
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
            {} as { objectMode: true },
            {
                objectMode: false,
                readableObjectMode: false,
                writableObjectMode: false,
            },
            {
                objectMode: false,
                readableObjectMode: false,
                writableObjectMode: true,
            },
        ] as const,
    )('options: %p', options => {
        describe.each<[string, () => stream.Transform]>([
            [
                'builtin Transform',
                () =>
                    new stream.Transform({
                        transform(_chunk, _encoding, done) {
                            this.push(42);
                            done();
                        },
                        ...options,
                    }),
            ],
            [
                'transformFrom()',
                () =>
                    transformFrom(
                        // @ts-expect-error TS2345: Argument of type '() => AsyncGenerator<number, void, any>' is not assignable to parameter of type '(source: AsyncIterableIterator<unknown>) => Iterable<string | Buffer | Uint8Array> | AsyncIterable<string | Buffer | Uint8Array>'.
                        async function*() {
                            yield 42;
                        },
                        options,
                    ),
            ],
        ])('%s', (_, createTransform) => {
            const data = [''];

            it.each<[string, Promise<void>]>([
                [
                    'pipe to WritableStream',
                    promisify(stream.pipeline)(
                        stream.Readable.from(data),
                        createTransform(),
                        createNoopWritable({ objectMode: true }),
                    ),
                ],
                [
                    'not pipe to WritableStream',
                    promisify(stream.pipeline)(
                        stream.Readable.from(data),
                        createTransform(),
                    ),
                ],
            ])('%s', async (_, resultPromise) => {
                await expect(resultPromise).rejects.toThrow(
                    /^The "chunk" argument must be of type string or an instance of Buffer or Uint8Array\. Received type number \(42\)$/,
                );
            });
        });
    });
});
