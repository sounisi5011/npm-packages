import events from 'events';
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
                    transform(chunk, _encoding, done) {
                        this.push(chunk);
                        done();
                    },
                }),
        ],
        [
            'transformFrom()',
            () =>
                transformFrom(async function*(source) {
                    for await (const { chunk } of source) {
                        yield chunk;
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
                    for await (const { chunk } of source) {
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
                        for await (const { chunk } of source) {
                            yield chunk;
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
        expect(outputChunkList).toStrictEqual(data);
    });
});

describe('transforms objects', () => {
    const data = [{ name: 'first' }, { name: 'second' }, { name: 'third' }];
    const outputData = [['first'], ['second'], ['third']];

    function hasProp<T extends PropertyKey>(obj: object, propName: T): obj is Record<T, unknown> {
        return propName in obj;
    }
    function validateChunk(chunk: unknown): chunk is { name: string } {
        if (typeof chunk !== 'object' || chunk === null) return false;
        if (!hasProp(chunk, 'name')) return false;
        return typeof chunk.name === 'string';
    }

    it.each<[string, () => stream.Transform]>([
        [
            'builtin Transform',
            () =>
                new stream.Transform({
                    transform(obj, _encoding, done) {
                        if (!validateChunk(obj)) {
                            done(new Error('Invalid chunk!'));
                            return;
                        }
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
                        for await (const { chunk: obj } of source) {
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

describe('transforms string with passed encoding', () => {
    const data = Buffer.from([0x1F, 0x20]);
    /**
     * @see https://github.com/nodejs/node/blob/v12.17.0/lib/buffer.js#L601-L719
     */
    const encodingList: BufferEncoding[] = ['utf8', 'ucs2', 'utf16le', 'latin1', 'ascii', 'base64', 'hex'];
    const outputData = Array.from({ length: encodingList.length }).fill(data);

    it.each<[string, () => stream.Transform]>([
        [
            'builtin Transform',
            () =>
                new stream.Transform({
                    transform(chunk, encoding, done) {
                        if (Buffer.isEncoding(encoding)) {
                            this.push(Buffer.from(chunk, encoding));
                        }
                        done();
                    },
                    writableObjectMode: true,
                }),
        ],
        [
            'transformFrom()',
            () =>
                transformFrom(async function*(source) {
                    for await (const { chunk, encoding } of source) {
                        if (typeof chunk === 'string') {
                            yield Buffer.from(chunk, encoding);
                        }
                    }
                }, { writableObjectMode: true }),
        ],
    ])('%s', async (_, createTransform) => {
        const transform = createTransform();
        const outputChunkList: unknown[] = [];

        for (const encoding of encodingList) {
            transform.write(data.toString(encoding), encoding);
        }
        transform.end();

        await promisify(stream.pipeline)(
            transform,
            createOutputWritable(outputChunkList),
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
                    for await (const { chunk } of source) {
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
                    for await (const { chunk } of source) {
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
                    for await (const { chunk } of source) {
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
    const outputData: readonly LogType[] = data.flatMap<LogType>((chunk, index) => {
        const prevChunk = data[index - 1];
        const nextChunk = data[index + 1];
        return [
            ...(prevChunk ? [] : [{ phase: 1, chunk }]),
            { phase: 2, chunk },
            ...(nextChunk ? [{ phase: 1, chunk: nextChunk }] : []),
            { phase: Infinity, chunk },
        ];
    });

    it('builtin Transform', async () => {
        const loggerList: LogType[] = [];
        await promisify(stream.pipeline)(
            stream.Readable.from(data),
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
            transformFrom(async function*(source) {
                for await (const { chunk } of source) {
                    loggerList.push({ phase: 1, chunk: chunk.toString('utf8') });
                    yield chunk;
                }
            }),
            transformFrom(async function*(source) {
                for await (const { chunk } of source) {
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
                    transform(chunk, _encoding, done) {
                        this.push(chunk);
                        done();
                    },
                }),
        ],
        [
            'builtin Transform (async done)',
            () =>
                new stream.Transform({
                    transform(chunk, _encoding, done) {
                        setImmediate(() => {
                            this.push(chunk);
                            done();
                        });
                    },
                }),
        ],
        [
            'transformFrom()',
            () =>
                transformFrom(async function*(source) {
                    for await (const { chunk } of source) {
                        yield chunk;
                    }
                }),
        ],
    ])('%s', (_, createTransform) => {
        // eslint-disable-next-line require-yield
        const readableInput = function*(): Iterable<unknown> {
            throw new Error('foo');
        };

        it.each<[string, (() => stream.Writable) | undefined]>([
            [
                'pipe to WritableStream',
                createNoopWritable,
            ],
            [
                'not pipe to WritableStream',
                undefined,
            ],
        ])('%s', async (_, createWritable) => {
            const resultPromise = promisify(stream.pipeline)(
                stream.Readable.from(readableInput()),
                createTransform(),
                ...createWritable ? [createWritable()] : [],
            );
            await expect(resultPromise).rejects.toThrow(Error);
            await expect(resultPromise).rejects.toThrow(/^foo$/);
        });
    });
});

describe('throw error from Transform', () => {
    const data = [''];

    describe('when transforming', () => {
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
                'builtin Transform (async done)',
                () =>
                    new stream.Transform({
                        transform(_chunk, _encoding, done) {
                            setImmediate(() => {
                                done(new Error('bar'));
                            });
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
            it.each<[string, (() => stream.Writable) | undefined]>([
                [
                    'pipe to WritableStream',
                    createNoopWritable,
                ],
                [
                    'not pipe to WritableStream',
                    undefined,
                ],
            ])('%s', async (_, createWritable) => {
                const resultPromise = promisify(stream.pipeline)(
                    stream.Readable.from(data),
                    createTransform(),
                    ...createWritable ? [createWritable()] : [],
                );
                await expect(resultPromise).rejects.toThrow(Error);
                await expect(resultPromise).rejects.toThrow(/^bar$/);
            });
        });
    });

    describe('when flush', () => {
        /**
         * @see https://github.com/nodejs/node/pull/34314
         */
        const isBugFixed = Number(/^\d+/.exec(process.versions.node)?.[0]) >= 15;

        const table: Array<[string, { createTransform: () => stream.Transform; hasBug: boolean }]> = [
            [
                'builtin Transform',
                {
                    createTransform: () =>
                        new stream.Transform({
                            transform(_chunk, _encoding, done) {
                                done();
                            },
                            flush(done) {
                                done(new Error('baz'));
                            },
                        }),
                    hasBug: false,
                },
            ],
            [
                'builtin Transform (async done)',
                {
                    createTransform: () =>
                        new stream.Transform({
                            transform(_chunk, _encoding, done) {
                                done();
                            },
                            flush(done) {
                                setImmediate(() => {
                                    done(new Error('baz'));
                                });
                            },
                        }),
                    hasBug: !isBugFixed,
                },
            ],
            [
                'transformFrom()',
                {
                    createTransform: () =>
                        // eslint-disable-next-line require-yield
                        transformFrom(async function*(source) {
                            // eslint-disable-next-line @typescript-eslint/no-unused-vars
                            for await (const _ of source);
                            throw new Error('baz');
                        }),
                    hasBug: false,
                },
            ],
        ];

        describe.each(table)('%s', (_, { createTransform }) => {
            it('pipe to WritableStream', async () => {
                const resultPromise = promisify(stream.pipeline)(
                    stream.Readable.from(data),
                    createTransform(),
                    createNoopWritable(),
                );
                await expect(resultPromise).rejects.toThrow(Error);
                await expect(resultPromise).rejects.toThrow(/^baz$/);
            });
        });

        const noBugTable = table.filter(([, { hasBug }]) => !hasBug);
        if (noBugTable.length >= 1) {
            describe.each(noBugTable)('%s', (_, { createTransform }) => {
                it('not pipe to WritableStream', async () => {
                    const resultPromise = promisify(stream.pipeline)(
                        stream.Readable.from(data),
                        createTransform(),
                    );
                    await expect(resultPromise).rejects.toThrow(Error);
                    await expect(resultPromise).rejects.toThrow(/^baz$/);
                });
            });
        }

        const hasBugTable = table.filter(([, { hasBug }]) => hasBug);
        if (hasBugTable.length >= 1) {
            describe.each(hasBugTable)('%s', (_, { createTransform }) => {
                it('not pipe to WritableStream (error cannot be detected)', async () => {
                    const transform = createTransform();

                    const errorPromise = (async () => (await events.once(transform, 'error'))[0])();
                    const resultPromise = promisify(stream.pipeline)(
                        stream.Readable.from(data),
                        transform,
                    );

                    // If the flush process is completed asynchronously, the `finish` event will be fired before the `error` event is fired.
                    // For this reason, `stream.pipeline()` will not get an error and will exit normally.
                    // see https://github.com/nodejs/node/issues/34274
                    await expect(resultPromise).resolves.toBeUndefined();

                    // However, errors are thrown.
                    // And the `error` event is also fired.
                    await expect(errorPromise).resolves.toBeInstanceOf(Error);
                    await expect(errorPromise).resolves.toStrictEqual(expect.objectContaining({
                        message: 'baz',
                    }));
                });
            });
        }
    });
});

describe('options that affect functionality should be ignored', () => {
    const data = ['first', 'second', 'third'];
    const outputData = data.map(str => Buffer.from(`:${str}.`));

    it.each<stream.TransformOptions>([
        {
            read(_size) {
                this.push(Buffer.from([255]));
                this.push(null);
            },
        },
        {
            write(_chunk, _encoding, done) {
                this.push(Buffer.from([255]));
                this.push(null);
                done();
            },
        },
        {
            writev(_chunks, done) {
                this.push(Buffer.from([255]));
                this.push(null);
                done();
            },
        },
        {
            final(done) {
                this.push(Buffer.from([255]));
                this.push(null);
                done();
            },
        },
        {
            transform(_chunk, _encoding, done) {
                this.push(Buffer.from([255]));
                this.push(null);
                done();
            },
        },
        {
            flush(done) {
                this.push(Buffer.from([255]));
                this.push(null);
                done();
            },
        },
    ])('%p', async options => {
        const outputChunkList: unknown[] = [];
        await promisify(stream.pipeline)(
            stream.Readable.from(data),
            transformFrom(
                async function*(source) {
                    for await (const { chunk } of source) {
                        if (!Buffer.isBuffer(chunk)) continue;
                        yield Buffer.concat([
                            Buffer.from(':'),
                            chunk,
                            Buffer.from('.'),
                        ]);
                    }
                },
                options,
            ),
            createOutputWritable(outputChunkList),
        );
        expect(outputChunkList).toStrictEqual(outputData);
    });

    interface TransformOptionsNode15 extends stream.TransformOptions {
        // This field has been added in Node v15.0.0
        construct?: (this: stream.Transform, callback: (error?: Error | null) => void) => void;
    }
    it.each<TransformOptionsNode15>([
        {
            // This field has been added in Node v15.0.0
            construct(done) {
                console.log({ done });
                done(new Error('!!!'));
            },
        },
        {
            destroy(_error, done) {
                done(new Error('???'));
            },
        },
    ])('%p', async options => {
        const resultPromise = promisify(stream.pipeline)(
            stream.Readable.from(data),
            transformFrom(
                // eslint-disable-next-line require-yield
                async function*() {
                    throw new Error('qux');
                },
                options,
            ),
        );
        await expect(resultPromise).rejects.toThrow(Error);
        await expect(resultPromise).rejects.toThrow(/^qux$/);
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
                    // eslint-disable-next-line require-yield
                    async function*(source) {
                        for await (const { chunk } of source) {
                            assertType<Buffer>(chunk);
                            expect(chunk).toBeInstanceOf(Buffer);
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
                    // eslint-disable-next-line require-yield
                    async function*(source) {
                        for await (const chunk of source) {
                            // @ts-expect-error TS2345: Argument of type 'unknown' is not assignable to parameter of type 'Buffer'.
                            assertType<Buffer>(chunk);
                            expect(chunk).not.toBeInstanceOf(Buffer);
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

            it.each<[string, (() => stream.Writable) | undefined]>([
                [
                    'pipe to WritableStream',
                    () => createNoopWritable({ objectMode: true }),
                ],
                [
                    'not pipe to WritableStream',
                    undefined,
                ],
            ])('%s', async (_, createWritable) => {
                const resultPromise = promisify(stream.pipeline)(
                    stream.Readable.from(data),
                    createTransform(),
                    ...createWritable ? [createWritable()] : [],
                );
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

            it.each<[string, (() => stream.Writable) | undefined]>([
                [
                    'pipe to WritableStream',
                    () => createNoopWritable({ objectMode: true }),
                ],
                [
                    'not pipe to WritableStream',
                    undefined,
                ],
            ])('%s', async (_, createWritable) => {
                const resultPromise = promisify(stream.pipeline)(
                    stream.Readable.from(data),
                    createTransform(),
                    ...createWritable ? [createWritable()] : [],
                );
                await expect(resultPromise).rejects.toThrow(
                    /^The "chunk" argument must be of type string or an instance of Buffer or Uint8Array\. Received type number \(42\)$/,
                );
            });
        });
    });
});
