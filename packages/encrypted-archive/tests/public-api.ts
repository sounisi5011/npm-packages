import * as stream from 'stream';

import escapeStringRegexp from 'escape-string-regexp';
import wordJoin from 'word-join';

import type { CompressOptions, CryptoAlgorithmName, EncryptOptions, InputDataType, KeyDerivationOptions } from '../src';
import { decrypt, decryptIterator, decryptStream, encrypt, encryptIterator, encryptStream } from '../src';
import { bufferChunk, genInputTypeCases, genIterableTypeCases, iterable2buffer } from './helpers';
import { pipelineAsync } from './helpers/stream';

const cleartext = Buffer.from('123456789'.repeat(20));
const password = 'dragon';
const cleartextMultiChunkList = bufferChunk(cleartext, 7);
const cleartextChunkCases: Array<[string, Buffer[]]> = [
    ['single chunk', [cleartext]],
    ['multi chunk', cleartextMultiChunkList],
];
const encryptedDataChunkIterCases: Array<
    [string, (options?: EncryptOptions) => Promise<Iterable<Buffer>> | AsyncIterable<Buffer>]
> = [
    ['single chunk', async opts => [await encrypt(cleartext, password, opts)]],
    ['multi chunk', opts => encryptIterator(password, opts)(cleartextMultiChunkList)],
];
const expectedInputTypeMsg = wordJoin([
    'string',
    `an instance of ${
        wordJoin([
            'Buffer',
            'TypedArray',
            'DataView',
            'ArrayBuffer',
        ], { conjunction: 'or', oxford: true })
    }`,
], { conjunction: 'or', oxford: true });
const chunkTypeErrorMessageRegExp = new RegExp(
    String.raw`^${
        escapeStringRegexp(`Invalid type chunk received. Each chunk must be of type ${expectedInputTypeMsg}. Received`)
    }\b`,
);
const passwordTypeErrorMessageRegExp = new RegExp(
    String.raw`^${
        escapeStringRegexp(
            `Invalid type password received. The password argument must be of type ${expectedInputTypeMsg}. Received`,
        )
    }\b`,
);

describe('input should allow the types described in documentation', () => {
    type Input = string | Buffer | NodeJS.TypedArray | DataView | ArrayBuffer | SharedArrayBuffer;

    describe('cleartext', () => {
        const cleartextInput = '12345678';
        const expectedCleartext = Buffer.from(cleartextInput);
        const cleartextCases = genInputTypeCases(cleartextInput);

        describe('encrypt()', () => {
            it.each<[string, Input]>(cleartextCases)('%s', async (_, cleartext) => {
                const encryptedDataAsync = encrypt(cleartext, password);
                await expect(encryptedDataAsync).resolves.not.toThrow();
                const decryptedData = await decrypt(await encryptedDataAsync, password);
                expect(decryptedData.equals(expectedCleartext)).toBeTrue();
            });
        });
        describe('encryptIterator()', () => {
            it.each<[string, Iterable<Input> | AsyncIterable<Input>]>(genIterableTypeCases(cleartextCases))(
                '%s',
                async (_, cleartextIterable) => {
                    const encryptedDataAsync = iterable2buffer(encryptIterator(password)(cleartextIterable));
                    await expect(encryptedDataAsync).resolves.not.toThrow();
                    const decryptedData = await decrypt(await encryptedDataAsync, password);
                    expect(decryptedData.equals(expectedCleartext)).toBeTrue();
                },
            );
        });
        describe('encryptStream()', () => {
            it.each<[string, Input]>(cleartextCases)('%s', async (_, cleartext) => {
                const encryptorStream = encryptStream(password);
                const waitFinish = pipelineAsync(
                    stream.Readable.from([cleartext]),
                    encryptorStream,
                );
                const encryptedDataAsync = iterable2buffer(encryptorStream);
                await Promise.all([
                    expect(encryptedDataAsync).resolves.not.toThrow(),
                    expect(waitFinish).resolves.not.toThrow(),
                ]);
                const decryptedData = await decrypt(await encryptedDataAsync, password);
                expect(decryptedData.equals(expectedCleartext)).toBeTrue();
            });
        });
    });
    describe('encryptedData', () => {
        const encryptedDataInput = Buffer.from(
            'kaDBAT4IARIMbPZU2oEBAD4AAAAAGhCe4H1n0Pyq9RSnQ9WiavW0ICAqECh1CdqWFCcpvBBpTG9BfaR6BhADGAwgAQQ33rvp',
            'base64',
        );
        const encryptedDataCases = genInputTypeCases(encryptedDataInput);

        describe('decrypt()', () => {
            it.each<[string, Input]>(encryptedDataCases)('%s', async (_, encryptedData) => {
                const decryptedDataAsync = decrypt(encryptedData, password);
                await expect(decryptedDataAsync).resolves.not.toThrow();
            });
        });
        describe('decryptIterator()', () => {
            it.each<[string, Iterable<Input> | AsyncIterable<Input>]>(genIterableTypeCases(encryptedDataCases))(
                '%s',
                async (_, encryptedDataIterable) => {
                    const decryptedDataAsync = iterable2buffer(decryptIterator(password)(encryptedDataIterable));
                    await expect(decryptedDataAsync).resolves.not.toThrow();
                },
            );
        });
        describe('decryptStream()', () => {
            it.each<[string, Input]>(encryptedDataCases)('%s', async (_, encryptedData) => {
                const waitFinish = pipelineAsync(
                    stream.Readable.from([encryptedData]),
                    decryptStream(password),
                );
                await expect(waitFinish).resolves.not.toThrow();
            });
        });
    });
    describe('password', () => {
        const passwordInput = '12345678';
        const passwordCases = genInputTypeCases(passwordInput);
        const encryptedDataAsync = encrypt(cleartext, passwordInput);

        describe('encrypt()', () => {
            it.each<[string, Input]>(passwordCases)('%s', async (_, password) => {
                const encryptedDataAsync = encrypt(cleartext, password);
                await expect(encryptedDataAsync).resolves.not.toThrow();
                await expect(decrypt(await encryptedDataAsync, passwordInput)).resolves.not.toThrow();
            });
        });
        describe('encryptIterator()', () => {
            it.each<[string, Input]>(passwordCases)('%s', async (_, password) => {
                const encryptedDataAsync = iterable2buffer(encryptIterator(password)([cleartext]));
                await expect(encryptedDataAsync).resolves.not.toThrow();
                await expect(decrypt(await encryptedDataAsync, passwordInput)).resolves.not.toThrow();
            });
        });
        describe('encryptStream()', () => {
            it.each<[string, Input]>(passwordCases)('%s', async (_, password) => {
                const encryptorStream = encryptStream(password);
                const waitFinish = pipelineAsync(
                    stream.Readable.from([cleartext]),
                    encryptorStream,
                );
                const encryptedDataAsync = iterable2buffer(encryptorStream);
                await Promise.all([
                    expect(encryptedDataAsync).resolves.not.toThrow(),
                    expect(waitFinish).resolves.not.toThrow(),
                ]);
                await expect(decrypt(await encryptedDataAsync, passwordInput)).resolves.not.toThrow();
            });
        });
        describe('decrypt()', () => {
            it.each<[string, Input]>(passwordCases)('%s', async (_, password) => {
                const decryptedDataAsync = decrypt(await encryptedDataAsync, password);
                await expect(decryptedDataAsync).resolves.not.toThrow();
            });
        });
        describe('decryptIterator()', () => {
            it.each<[string, Input]>(passwordCases)('%s', async (_, password) => {
                const decryptedDataAsync = iterable2buffer(decryptIterator(password)([await encryptedDataAsync]));
                await expect(decryptedDataAsync).resolves.not.toThrow();
            });
        });
        describe('decryptStream()', () => {
            it.each<[string, Input]>(passwordCases)('%s', async (_, password) => {
                const waitFinish = pipelineAsync(
                    stream.Readable.from([await encryptedDataAsync]),
                    decryptStream(password),
                );
                await expect(waitFinish).resolves.not.toThrow();
            });
        });
    });
});

describe('should throw an error if a value of an invalid type is specified as input', () => {
    const invalidInputCases: unknown[] = [
        null,
        undefined,
        true,
        false,
        42,
        { hoge: 'fuga' },
    ];
    const genInvalidInputCases = (fnName: string): typeof invalidInputCases =>
        invalidInputCases
            .filter(value => !(value === null && fnName.endsWith('Stream()')));
    const cleartext = '';
    const encryptedData = '';
    const password = '';

    const encryptCases: Array<
        [string, (arg: { cleartext: InputDataType; password: InputDataType }) => Promise<unknown>]
    > = [
        ['encrypt()', async ({ cleartext, password }) => await encrypt(cleartext, password)],
        [
            'encryptIterator()',
            async ({ cleartext, password }) => await iterable2buffer(encryptIterator(password)([cleartext])),
        ],
        [
            'encryptStream()',
            async ({ cleartext, password }) =>
                await pipelineAsync(stream.Readable.from([cleartext]), encryptStream(password)),
        ],
    ];
    const decryptCases: Array<
        [string, (arg: { encryptedData: InputDataType; password: InputDataType }) => Promise<unknown>]
    > = [
        ['decrypt()', async ({ encryptedData, password }) => await decrypt(encryptedData, password)],
        [
            'decryptIterator()',
            async ({ encryptedData, password }) => await iterable2buffer(decryptIterator(password)([encryptedData])),
        ],
        [
            'decryptStream()',
            async ({ encryptedData, password }) =>
                await pipelineAsync(stream.Readable.from([encryptedData]), decryptStream(password)),
        ],
    ];

    describe('cleartext', () => {
        describe.each(encryptCases)('%s', (encryptFnName, encryptFn) => {
            it.each(genInvalidInputCases(encryptFnName))('%o', async invalidInput => {
                // @ts-expect-error TS2322: Type 'unknown' is not assignable to type 'InputDataType'.
                const cleartext: InputDataType = invalidInput;
                const waitEncryption = encryptFn({ cleartext, password });
                await expect(waitEncryption).rejects.toThrowWithMessage(
                    TypeError,
                    chunkTypeErrorMessageRegExp,
                );
            });
        });
    });
    describe('encryptedData', () => {
        describe.each(decryptCases)('%s', (decryptFnName, decryptFn) => {
            it.each(genInvalidInputCases(decryptFnName))('%o', async invalidInput => {
                // @ts-expect-error TS2322: Type 'unknown' is not assignable to type 'InputDataType'.
                const encryptedData: InputDataType = invalidInput;
                const waitDecryption = decryptFn({ encryptedData, password });
                await expect(waitDecryption).rejects.toThrowWithMessage(
                    TypeError,
                    chunkTypeErrorMessageRegExp,
                );
            });
        });
    });
    describe('password', () => {
        describe.each([...encryptCases, ...decryptCases])('%s', (fnName, encryptOrDecryptFn) => {
            it.each(genInvalidInputCases(fnName))('%o', async invalidInput => {
                // @ts-expect-error TS2322: Type 'unknown' is not assignable to type 'InputDataType'.
                const password: InputDataType = invalidInput;
                const waitEncryption = encryptOrDecryptFn({ cleartext, encryptedData, password });
                await expect(waitEncryption).rejects.toThrowWithMessage(
                    TypeError,
                    passwordTypeErrorMessageRegExp,
                );
            });
        });
    });
});

describe('output value must be a `Promise<Buffer>`', () => {
    type Output = Promise<Buffer>;
    it('encrypt()', async () => {
        const output: Output = encrypt(cleartext, password);
        expect(output).toBeInstanceOf(Promise);
        await expect(output).resolves.toBeInstanceOf(Buffer);
    });
    it('decrypt()', async () => {
        const encryptedData = await encrypt(cleartext, password);
        const output: Output = decrypt(encryptedData, password);
        expect(output).toBeInstanceOf(Promise);
        await expect(output).resolves.toBeInstanceOf(Buffer);
    });
});

describe('output value must be an `AsyncIterableIterator<Buffer>`', () => {
    type Output = AsyncIterableIterator<Buffer>;
    describe.each<readonly [string, () => Output | Promise<Output>]>([
        ...cleartextChunkCases.map((
            [label, cleartextChunkList],
        ) => [`encryptIterator() [${label}]`, () => encryptIterator(password)(cleartextChunkList)] as const),
        ...encryptedDataChunkIterCases.map(([label, genEncryptedDataChunkIter]) =>
            [`decryptIterator() [${label}]`, async () => {
                const encryptedDataChunkIter = await genEncryptedDataChunkIter();
                return decryptIterator(password)(encryptedDataChunkIter);
            }] as const
        ),
    ])('%s', (_, genOutput) => {
        it('implements `AsyncIterator<Buffer>`', async () => {
            expect.hasAssertions();

            const output: AsyncIterator<Buffer> = await genOutput();
            do {
                const resultAsync = output.next();
                if (await resultAsync.then(result => result.done, () => false)) break;
                await expect(resultAsync).resolves.toMatchObject({
                    value: expect.any(Buffer),
                });
            } while (true);
        });
        it('implements `AsyncIterable<Buffer>`', async () => {
            expect.hasAssertions();

            const output: AsyncIterable<Buffer> = await genOutput();
            for await (const chunk of output) {
                expect(chunk).toBeInstanceOf(Buffer);
            }
        });
    });
});

describe('output Stream must return `Buffer` when read', () => {
    describe('encryptStream()', () => {
        it.each(cleartextChunkCases)('%s', async (_, cleartextChunkList) => {
            expect.hasAssertions();

            const outputStream = encryptStream(password);
            const waitFinish = pipelineAsync(
                stream.Readable.from(cleartextChunkList),
                outputStream,
            );
            for await (const chunk of outputStream) {
                expect(chunk).toBeInstanceOf(Buffer);
            }
            await waitFinish;
        });
    });
    describe('decryptStream()', () => {
        it.each(encryptedDataChunkIterCases)('%s', async (_, genEncryptedDataChunkIter) => {
            expect.hasAssertions();

            const outputStream = decryptStream(password);
            const waitFinish = pipelineAsync(
                stream.Readable.from(await genEncryptedDataChunkIter()),
                outputStream,
            );
            for await (const chunk of outputStream) {
                expect(chunk).toBeInstanceOf(Buffer);
            }
            await waitFinish;
        });
    });
});

const encryptCases: Array<readonly [string, (options?: EncryptOptions) => Promise<Buffer>]> = [
    ['encrypt()', async options => await encrypt(cleartext, password, options)],
    ...cleartextChunkCases.flatMap(([label, cleartextChunkList]) =>
        [
            [
                `encryptIterator() [input: ${label}]`,
                async (options?: EncryptOptions) =>
                    await iterable2buffer(encryptIterator(password, options)(cleartextChunkList)),
            ],
            [
                `encryptStream() [input: ${label}]`,
                async (options?: EncryptOptions) => {
                    const encryptorStream = encryptStream(password, options);
                    const [encryptedData] = await Promise.all([
                        iterable2buffer(encryptorStream),
                        pipelineAsync(
                            stream.Readable.from([cleartext]),
                            encryptorStream,
                        ),
                    ]);
                    return encryptedData;
                },
            ],
        ] as const
    ),
];

const decryptCases: Array<
    readonly [
        string,
        (encryptedData: InputDataType | Promise<InputDataType>, password: InputDataType) => Promise<Buffer>,
    ]
> = [
    [
        'decrypt()',
        async (encryptedData, password) => await decrypt(await encryptedData, password),
    ],
    [
        'decryptIterator()',
        async (encryptedData, password) => await iterable2buffer(decryptIterator(password)([await encryptedData])),
    ],
    [
        'decryptStream()',
        async (encryptedData, password) => {
            const decryptorStream = decryptStream(password);
            const [decryptedData] = await Promise.all([
                iterable2buffer(decryptorStream),
                pipelineAsync(
                    stream.Readable.from([await encryptedData]),
                    decryptorStream,
                ),
            ]);
            return decryptedData;
        },
    ],
];

describe('input and output must not be the same', () => {
    it.each(encryptCases)('%s', async (_, encryptFn) => {
        const encryptedData = await encryptFn();
        expect(cleartext.equals(encryptedData)).toBeFalse();
    });
});

describe('never generate same data', () => {
    it.each(encryptCases)('%s', async (_, encryptFn) => {
        const encryptedData1 = await encryptFn();
        const encryptedData2 = await encryptFn();
        const encryptedData3 = await encryptFn();
        expect(encryptedData1.equals(encryptedData2)).toBeFalse();
        expect(encryptedData1.equals(encryptedData3)).toBeFalse();
        expect(encryptedData2.equals(encryptedData3)).toBeFalse();
    });
});

const shouldBeDecryptableTest = (options: EncryptOptions): void => {
    describe('should be decryptable', () => {
        it.each<[string, () => Promise<Buffer>]>([
            ['encrypt() |> decrypt()', async () => {
                const encryptedData = await encrypt(cleartext, password, options);
                return await decrypt(encryptedData, password);
            }],
            ['encrypt() |> decryptIterator()', async () => {
                const encryptedDataChunkIter = [await encrypt(cleartext, password, options)];
                return await iterable2buffer(decryptIterator(password)(encryptedDataChunkIter));
            }],
            ['encrypt() |> decryptStream()', async () => {
                const encryptedDataChunkIter = [await encrypt(cleartext, password, options)];
                const decryptorStream = decryptStream(password);
                const [decryptedData] = await Promise.all([
                    iterable2buffer(decryptorStream),
                    pipelineAsync(
                        stream.Readable.from(encryptedDataChunkIter),
                        decryptorStream,
                    ),
                ]);
                return decryptedData;
            }],
            ...cleartextChunkCases.flatMap<[string, () => Promise<Buffer>]>(([label, cleartextChunkList]) => [
                [
                    `encryptIterator() [input: ${label}] |> decrypt()`,
                    async () => {
                        const encryptedDataChunkIter = encryptIterator(password, options)(cleartextChunkList);
                        const encryptedData = await iterable2buffer(encryptedDataChunkIter);
                        return await decrypt(encryptedData, password);
                    },
                ],
                [
                    `encryptIterator() [input: ${label}] |> decryptIterator()`,
                    async () => {
                        const encryptedDataChunkIter = encryptIterator(password, options)(cleartextChunkList);
                        return await iterable2buffer(decryptIterator(password)(encryptedDataChunkIter));
                    },
                ],
                [
                    `encryptIterator() [input: ${label}] |> decryptStream()`,
                    async () => {
                        const encryptedDataChunkIter = encryptIterator(password, options)(cleartextChunkList);
                        const decryptorStream = decryptStream(password);
                        const [decryptedData] = await Promise.all([
                            iterable2buffer(decryptorStream),
                            pipelineAsync(
                                stream.Readable.from(encryptedDataChunkIter),
                                decryptorStream,
                            ),
                        ]);
                        return decryptedData;
                    },
                ],
                [
                    `encryptStream() [input: ${label}] |> decrypt()`,
                    async () => {
                        const encryptorStream = encryptStream(password, options);
                        const [encryptedData] = await Promise.all([
                            iterable2buffer(encryptorStream),
                            pipelineAsync(
                                stream.Readable.from(cleartextChunkList),
                                encryptorStream,
                            ),
                        ]);
                        return await decrypt(encryptedData, password);
                    },
                ],
                [
                    `encryptStream() [input: ${label}] |> decryptIterator()`,
                    async () => {
                        const encryptorStream = encryptStream(password, options);
                        const [decryptedData] = await Promise.all([
                            iterable2buffer(decryptIterator(password)(encryptorStream)),
                            pipelineAsync(
                                stream.Readable.from(cleartextChunkList),
                                encryptorStream,
                            ),
                        ]);
                        return decryptedData;
                    },
                ],
                [
                    `encryptStream() [input: ${label}] |> decryptStream()`,
                    async () => {
                        const encryptorStream = encryptStream(password, options);
                        const decryptorStream = decryptStream(password);
                        const [decryptedData] = await Promise.all([
                            iterable2buffer(decryptorStream),
                            pipelineAsync(
                                stream.Readable.from(cleartextChunkList),
                                encryptorStream,
                                decryptorStream,
                            ),
                        ]);
                        return decryptedData;
                    },
                ],
            ]),
        ])('%s', async (_, decryptFn) => {
            const decryptedData = await decryptFn();
            expect(decryptedData.equals(cleartext)).toBeTrue();
        });
    });
};

describe('should support encryption algorithms', () => {
    describe.each<CryptoAlgorithmName>([
        'aes-256-gcm',
        'chacha20-poly1305',
    ])('%s', algorithm => {
        it.each(encryptCases)('%s', async (_, encryptFn) => {
            await expect(encryptFn({ algorithm })).toResolve();
        });
        shouldBeDecryptableTest({ algorithm });
    });
    describe('unknown algorithm', () => {
        it.each(encryptCases)('%s', async (_, encryptFn) => {
            await expect(encryptFn({
                // @ts-expect-error TS2322
                algorithm: 'foo',
            })).rejects.toThrowWithMessage(
                TypeError,
                `Unknown algorithm was received: foo`,
            );
        });
    });
});

describe('should support key derivation functions', () => {
    describe.each<KeyDerivationOptions['algorithm']>([
        'argon2d',
        'argon2id',
    ])('%s', keyDerivationAlgorithm => {
        it.each(encryptCases)('%s', async (_, encryptFn) => {
            await expect(encryptFn({ keyDerivation: { algorithm: keyDerivationAlgorithm } }))
                .toResolve();
        });
        shouldBeDecryptableTest({ keyDerivation: { algorithm: keyDerivationAlgorithm } });
    });
    describe('unknown algorithm', () => {
        it.each(encryptCases)('%s', async (_, encryptFn) => {
            await expect(encryptFn({
                keyDerivation: {
                    // @ts-expect-error TS2322
                    algorithm: 'bar',
                },
            })).rejects.toThrowWithMessage(
                TypeError,
                `Unknown KDF (Key Derivation Function) algorithm was received: bar`,
            );
        });
    });
});

describe('should support compression algorithms', () => {
    const uncompressedEncryptedDataAsync = encrypt(cleartext, password);

    describe.each<CompressOptions | CompressOptions['algorithm']>([
        'gzip',
        'brotli',
    ])('%s', compressAlgorithm => {
        it.each(encryptCases)('%s', async (_, encryptFn) => {
            const compressedEncryptedData = await encryptFn({ compress: compressAlgorithm });
            expect(compressedEncryptedData).toBeLessThanByteSize(await uncompressedEncryptedDataAsync);
        });
        shouldBeDecryptableTest({ compress: compressAlgorithm });
    });
    describe('unknown algorithm', () => {
        it.each(encryptCases)('%s', async (_, encryptFn) => {
            await expect(encryptFn({
                // @ts-expect-error TS2322
                compress: 'hoge',
            })).rejects.toThrowWithMessage(
                TypeError,
                `Unknown compress algorithm was received: hoge`,
            );
        });
    });
});

describe('wrong password should fail', () => {
    const password2 = 'flying lizard';
    describe.each<CryptoAlgorithmName>([
        'aes-256-gcm',
        'chacha20-poly1305',
    ])('%s', algorithm => {
        const encryptedDataAsync = encrypt(cleartext, password, { algorithm });
        it.each(decryptCases)('%s', async (_, decryptFn) => {
            await expect(decryptFn(encryptedDataAsync, password2)).rejects.toThrowWithMessage(
                Error,
                `Unsupported state or unable to authenticate data`,
            );
        });
    });
});
