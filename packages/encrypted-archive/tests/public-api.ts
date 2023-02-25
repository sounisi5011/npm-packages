import escapeStringRegexp from 'escape-string-regexp';
import wordJoin from 'word-join';

import type {
    CompressOptions,
    CryptoAlgorithmName,
    EncryptOptions,
    InputDataType,
    KeyDerivationOptions,
} from '../src/index.node';
import { decrypt, decryptIterator, decryptStream, encrypt, encryptIterator, encryptStream } from '../src/index.node';
import { bufferChunk, genInputTypeCases, genIterableTypeCases, iterable2buffer } from './helpers';
import { runDuplex } from './helpers/stream';

type EncryptCase<TPlaintext = InputDataType, TReturn = Promise<Buffer>> = [
    string,
    (arg: { plaintext: TPlaintext; password: InputDataType; options?: EncryptOptions }) => TReturn,
];

const testValue = (() => {
    const plaintextBuf = Buffer.from('123456789'.repeat(20));
    const multiChunkList = bufferChunk(plaintextBuf, 7);
    const encryptedData = Object.assign(
        Buffer.from(
            'kaDBAT4IARIMbPZU2oEBAD4AAAAAGhCe4H1n0Pyq9RSnQ9WiavW0ICAqECh1CdqWFCcpvBBpTG9BfaR6BhADGAwgAQQ33rvp',
            'base64',
        ),
        { password: 'dragon' },
    );
    const encryptedDataChunkIterCases: Array<EncryptCase<Buffer, Promise<Iterable<Buffer>> | AsyncIterable<Buffer>>> = [
        ['single chunk', async ({ plaintext, password, options }) => [await encrypt(plaintext, password, options)]],
        [
            'multi chunk',
            ({ plaintext, password, options }) => encryptIterator(password, options)(bufferChunk(plaintext, 7)),
        ],
    ];

    return {
        plaintext: Object.assign(plaintextBuf, {
            multiChunkList,
            chunkCases: [
                ['single chunk', [plaintextBuf]],
                ['multi chunk', multiChunkList],
            ] as const,
        }),
        encryptedData,
        encryptedDataChunkIterCases,
    };
})();
const errorMessageRegExp = (() => {
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
    return {
        chunkType: new RegExp(
            String.raw`^${
                escapeStringRegexp(
                    `Invalid type chunk received. Each chunk must be of type ${expectedInputTypeMsg}. Received`,
                )
            }\b`,
        ),
        passwordType: new RegExp(
            String.raw`^${
                escapeStringRegexp(
                    `Invalid type password received. The password argument must be of type ${expectedInputTypeMsg}. Received`,
                )
            }\b`,
        ),
    };
})();
const apiCases = (() => {
    const encryptCasesAllowIterInput: Array<EncryptCase<Iterable<InputDataType> | AsyncIterable<InputDataType>>> = [
        [
            'encryptIterator()',
            async ({ plaintext, password, options }) =>
                await iterable2buffer(encryptIterator(password, options)(plaintext)),
        ],
        [
            'encryptStream()',
            async ({ plaintext, password, options }) =>
                Buffer.concat(await runDuplex(plaintext, encryptStream(password, options))),
        ],
    ];
    const encryptCasesOnlyRawInput: EncryptCase[] = [
        [
            'encrypt()',
            async ({ plaintext, password, options }) => await encrypt(plaintext, password, options),
        ],
    ];
    const encryptCases = [
        ...encryptCasesOnlyRawInput,
        ...encryptCasesAllowIterInput
            .map<EncryptCase>(([label, fn]) => [label, async arg => await fn({ ...arg, plaintext: [arg.plaintext] })]),
    ];

    type EncryptCaseWithoutPlaintextType = [
        string,
        (arg: { password: InputDataType; options?: EncryptOptions }) => Promise<Buffer>,
        { expectedPlaintext: Buffer },
    ];
    const expectedPlaintext = testValue.plaintext;
    const encryptCasesWithPlaintextChunk = [
        ...encryptCasesOnlyRawInput.map<EncryptCaseWithoutPlaintextType>(([label, fn]) => [
            label,
            async arg => await fn({ ...arg, plaintext: expectedPlaintext }),
            { expectedPlaintext },
        ]),
        ...expectedPlaintext.chunkCases.flatMap(([plaintextLabel, plaintextChunkList]) =>
            encryptCasesAllowIterInput.map<EncryptCaseWithoutPlaintextType>(([apiLabel, fn]) => [
                `${apiLabel} [input: ${plaintextLabel}]`,
                async arg => await fn({ ...arg, plaintext: plaintextChunkList }),
                { expectedPlaintext },
            ])
        ),
    ];

    type DecryptCase<TEncryptedData> = [
        string,
        (arg: { encryptedData: TEncryptedData; password: InputDataType }) => Promise<Buffer>,
    ];
    const decryptCasesAllowIterInput: Array<DecryptCase<Iterable<InputDataType> | AsyncIterable<InputDataType>>> = [
        [
            'decryptIterator()',
            async ({ encryptedData, password }) => await iterable2buffer(decryptIterator(password)(encryptedData)),
        ],
        [
            'decryptStream()',
            async ({ encryptedData, password }) =>
                Buffer.concat(await runDuplex(encryptedData, decryptStream(password))),
        ],
    ];
    const decryptCases: Array<DecryptCase<InputDataType>> = [
        [
            'decrypt()',
            async ({ encryptedData, password }) => await decrypt(encryptedData, password),
        ],
        ...decryptCasesAllowIterInput
            .map<DecryptCase<InputDataType>>((
                [label, fn],
            ) => [label, async arg => await fn({ ...arg, encryptedData: [arg.encryptedData] })]),
    ];

    return {
        encrypt: Object.assign(encryptCases, {
            withPlaintextChunk: encryptCasesWithPlaintextChunk,
        }),
        decrypt: Object.assign(decryptCases, {
            allowIterInput: decryptCasesAllowIterInput,
        }),
    };
})();

describe('input should allow the types described in documentation', () => {
    type Input = string | Buffer | NodeJS.TypedArray | DataView | ArrayBuffer | SharedArrayBuffer;

    describe('plaintext', () => {
        const plaintextInput = '12345678';
        const password = 'foo';
        const expectedPlaintext = Buffer.from(plaintextInput);
        const plaintextCases = genInputTypeCases(plaintextInput);

        describe('encrypt()', () => {
            it.each<[string, Input]>(plaintextCases)('%s', async (_, plaintext) => {
                const encryptedDataAsync = encrypt(plaintext, password);
                await expect(encryptedDataAsync).resolves.not.toThrow();
                const decryptedData = await decrypt(await encryptedDataAsync, password);
                expect(decryptedData.equals(expectedPlaintext)).toBeTrue();
            });
        });
        describe('encryptIterator()', () => {
            it.each<[string, Iterable<Input> | AsyncIterable<Input>]>(genIterableTypeCases(plaintextCases))(
                '%s',
                async (_, plaintextIterable) => {
                    const encryptedDataAsync = iterable2buffer(encryptIterator(password)(plaintextIterable));
                    await expect(encryptedDataAsync).resolves.not.toThrow();
                    const decryptedData = await decrypt(await encryptedDataAsync, password);
                    expect(decryptedData.equals(expectedPlaintext)).toBeTrue();
                },
            );
        });
        describe('encryptStream()', () => {
            it.each<[string, Input]>(plaintextCases)('%s', async (_, plaintext) => {
                const encryptedDataListAsync = runDuplex([plaintext], encryptStream(password));
                await expect(encryptedDataListAsync).resolves.not.toThrow();

                const encryptedData = Buffer.concat(await encryptedDataListAsync);
                const decryptedData = await decrypt(encryptedData, password);
                expect(decryptedData.equals(expectedPlaintext)).toBeTrue();
            });
        });
    });
    describe('encryptedData', () => {
        const encryptedDataCases = genInputTypeCases(testValue.encryptedData);
        const { password } = testValue.encryptedData;

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
                const waitFinish = runDuplex([encryptedData], decryptStream(password));
                await expect(waitFinish).resolves.not.toThrow();
            });
        });
    });
    describe('password', () => {
        const { plaintext } = testValue;
        const originalPassword = '12345678';
        const passwordCases = genInputTypeCases(originalPassword);
        const encryptedDataAsync = encrypt(plaintext, originalPassword);

        describe.each(apiCases.encrypt)('%s', (_, encryptFn) => {
            it.each<[string, Input]>(passwordCases)('%s', async (_, passwordValue) => {
                const encryptedDataAsync = encryptFn({ plaintext, password: passwordValue });
                await expect(encryptedDataAsync).resolves.not.toThrow();
                await expect(decrypt(await encryptedDataAsync, originalPassword)).resolves.not.toThrow();
            });
        });
        describe.each(apiCases.decrypt)('%s', (_, decryptFn) => {
            it.each<[string, Input]>(passwordCases)('%s', async (_, passwordValue) => {
                const encryptedData = await encryptedDataAsync;
                const waitFinish = decryptFn({ encryptedData, password: passwordValue });
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
    const plaintext = '';
    const encryptedData = '';
    const password = '';

    describe('plaintext', () => {
        describe.each(apiCases.encrypt)('%s', (encryptFnName, encryptFn) => {
            it.each(genInvalidInputCases(encryptFnName))('%o', async invalidInput => {
                // @ts-expect-error TS2322: Type 'unknown' is not assignable to type 'InputDataType'.
                const plaintext: InputDataType = invalidInput;
                const waitFinish = encryptFn({ plaintext, password });
                await expect(waitFinish).rejects.toThrowWithMessage(
                    TypeError,
                    errorMessageRegExp.chunkType,
                );
            });
        });
    });
    describe('encryptedData', () => {
        describe.each(apiCases.decrypt)('%s', (decryptFnName, decryptFn) => {
            it.each(genInvalidInputCases(decryptFnName))('%o', async invalidInput => {
                // @ts-expect-error TS2322: Type 'unknown' is not assignable to type 'InputDataType'.
                const encryptedData: InputDataType = invalidInput;
                const waitFinish = decryptFn({ encryptedData, password });
                await expect(waitFinish).rejects.toThrowWithMessage(
                    TypeError,
                    errorMessageRegExp.chunkType,
                );
            });
        });
    });
    describe('password', () => {
        describe.each([...apiCases.encrypt, ...apiCases.decrypt])('%s', (fnName, encryptOrDecryptFn) => {
            it.each(genInvalidInputCases(fnName))('%o', async invalidInput => {
                // @ts-expect-error TS2322: Type 'unknown' is not assignable to type 'InputDataType'.
                const password: InputDataType = invalidInput;
                const waitFinish = encryptOrDecryptFn({ plaintext, encryptedData, password });
                await expect(waitFinish).rejects.toThrowWithMessage(
                    TypeError,
                    errorMessageRegExp.passwordType,
                );
            });
        });
    });
});

describe('output value must be a `Promise<Buffer>`', () => {
    type Output = Promise<Buffer>;
    it('encrypt()', async () => {
        const output: Output = encrypt('hoge', 'fuga');
        expect(output).toBeInstanceOf(Promise);
        await expect(output).resolves.toBeInstanceOf(Buffer);
    });
    it('decrypt()', async () => {
        const output: Output = decrypt(testValue.encryptedData, testValue.encryptedData.password);
        expect(output).toBeInstanceOf(Promise);
        await expect(output).resolves.toBeInstanceOf(Buffer);
    });
});

describe('output value must be an `AsyncIterableIterator<Buffer>`', () => {
    type Output = AsyncIterableIterator<Buffer>;
    const implementsAsyncIterableIteratorTest = (genOutput: () => Output | Promise<Output>): void => {
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
    };

    describe('encryptIterator()', () => {
        describe.each(testValue.plaintext.chunkCases)('%s', (_, plaintextChunkList) => {
            implementsAsyncIterableIteratorTest(() => encryptIterator('')(plaintextChunkList));
        });
    });
    describe('decryptIterator()', () => {
        describe.each(testValue.encryptedDataChunkIterCases)('%s', (_, genEncryptedDataChunkIter) => {
            implementsAsyncIterableIteratorTest(async () => {
                const password = 'bar';
                const encryptedDataChunkIter = await genEncryptedDataChunkIter({
                    plaintext: testValue.plaintext,
                    password,
                });
                return decryptIterator(password)(encryptedDataChunkIter);
            });
        });
    });
});

describe('output Stream must return `Buffer` when read', () => {
    describe('encryptStream()', () => {
        it.each(testValue.plaintext.chunkCases)('%s', async (_, plaintextChunkList) => {
            expect.hasAssertions();

            const chunkList = await runDuplex(plaintextChunkList, encryptStream(''));
            for (const chunk of chunkList) {
                expect(chunk).toBeInstanceOf(Buffer);
            }
        });
    });
    describe('decryptStream()', () => {
        it.each(testValue.encryptedDataChunkIterCases)('%s', async (_, genEncryptedDataChunkIter) => {
            expect.hasAssertions();

            const password = 'baz';
            const encryptedDataChunkIter = await genEncryptedDataChunkIter({
                plaintext: testValue.plaintext,
                password,
            });
            const chunkList = await runDuplex(encryptedDataChunkIter, decryptStream(password));
            for await (const chunk of chunkList) {
                expect(chunk).toBeInstanceOf(Buffer);
            }
        });
    });
});

describe('input and output must not be the same', () => {
    it.each(apiCases.encrypt.withPlaintextChunk)('%s', async (_, encryptFn, { expectedPlaintext }) => {
        const encryptedData = await encryptFn({ password: '' });
        expect(expectedPlaintext.equals(encryptedData)).toBeFalse();
    });
});

describe('never generate same data', () => {
    it.each(apiCases.encrypt.withPlaintextChunk)('%s', async (_, encryptFn) => {
        const encryptedData1 = await encryptFn({ password: '' });
        const encryptedData2 = await encryptFn({ password: '' });
        const encryptedData3 = await encryptFn({ password: '' });
        expect(encryptedData1.equals(encryptedData2)).toBeFalse();
        expect(encryptedData1.equals(encryptedData3)).toBeFalse();
        expect(encryptedData2.equals(encryptedData3)).toBeFalse();
    });
});

const shouldBeDecryptableTest = (options: EncryptOptions): void => {
    type TestCase<TArgs extends unknown[] = []> = [string, (...args: TArgs) => Promise<Buffer>];
    describe('should be decryptable', () => {
        const plaintext = testValue.plaintext;
        const password = 'qux';
        it.each<TestCase>(
            apiCases.decrypt.map<TestCase>(([decryptLabel, decryptFn]) => [
                `encrypt() |> ${decryptLabel}`,
                async () => {
                    const encryptedData = await encrypt(plaintext, password, options);
                    return await decryptFn({ encryptedData, password });
                },
            ]),
        )('%s', async (_, decryptFn) => {
            const decryptedData = await decryptFn();
            expect(decryptedData.equals(plaintext)).toBeTrue();
        });
        describe.each<TestCase<[plaintextChunkList: readonly Buffer[]]>>([
            [
                `encryptIterator() |> decrypt()`,
                async plaintextChunkList => {
                    const encryptedDataChunkIter = encryptIterator(password, options)(plaintextChunkList);
                    const encryptedData = await iterable2buffer(encryptedDataChunkIter);
                    return await decrypt(encryptedData, password);
                },
            ],
            ...apiCases.decrypt.allowIterInput.map<TestCase<[readonly Buffer[]]>>(([decryptLabel, decryptFn]) => [
                `encryptIterator() |> ${decryptLabel}`,
                async plaintextChunkList => {
                    const encryptedDataChunkIter = encryptIterator(password, options)(plaintextChunkList);
                    return await decryptFn({ encryptedData: encryptedDataChunkIter, password });
                },
            ]),
            [
                `encryptStream() |> decrypt()`,
                async plaintextChunkList => {
                    const encryptedDataChunkIter = await runDuplex(
                        plaintextChunkList,
                        encryptStream(password, options),
                    );
                    const encryptedData = await iterable2buffer(encryptedDataChunkIter);
                    return await decrypt(encryptedData, password);
                },
            ],
            [
                `encryptStream() |> decryptIterator()`,
                async plaintextChunkList => {
                    const encryptedDataChunkIter = await runDuplex(
                        plaintextChunkList,
                        encryptStream(password, options),
                    );
                    return await iterable2buffer(decryptIterator(password)(encryptedDataChunkIter));
                },
            ],
            [
                `encryptStream() |> decryptStream()`,
                async plaintextChunkList => {
                    return Buffer.concat(
                        await runDuplex(
                            plaintextChunkList,
                            encryptStream(password, options),
                            decryptStream(password),
                        ),
                    );
                },
            ],
        ])('%s', (_, decryptFn) => {
            it.each(plaintext.chunkCases)('input: %s', async (_, plaintextChunkList) => {
                const decryptedData = await decryptFn(plaintextChunkList);
                expect(decryptedData.equals(plaintext)).toBeTrue();
            });
        });
    });
};

describe('should support encryption algorithms', () => {
    describe.each<CryptoAlgorithmName>([
        'aes-256-gcm',
        'chacha20-poly1305',
    ])('%s', algorithm => {
        it.each(apiCases.encrypt.withPlaintextChunk)('%s', async (_, encryptFn) => {
            const options: EncryptOptions = { algorithm };
            await expect(encryptFn({ password: '', options })).resolves.not.toThrow();
        });
        shouldBeDecryptableTest({ algorithm });
    });
    describe('unknown algorithm', () => {
        it.each(apiCases.encrypt.withPlaintextChunk)('%s', async (_, encryptFn) => {
            const options: EncryptOptions = {
                // @ts-expect-error TS2322
                algorithm: 'foo',
            };
            await expect(encryptFn({ password: '', options })).rejects.toThrowWithMessage(
                TypeError,
                `Unknown algorithm was received: foo`,
            );
        });
    });
    describe('invalid type algorithm', () => {
        it.each(apiCases.encrypt.withPlaintextChunk)('%s', async (_, encryptFn) => {
            const options: EncryptOptions = {
                // @ts-expect-error TS2322: Type 'number' is not assignable to type '"aes-256-gcm" | "chacha20-poly1305" | undefined'.
                algorithm: 42,
            };
            await expect(encryptFn({ password: '', options })).rejects.toThrowWithMessage(
                TypeError,
                `Unknown algorithm was received: 42`,
            );
        });
    });
});

describe('should support key derivation functions', () => {
    describe.each<KeyDerivationOptions['algorithm']>([
        'argon2d',
        'argon2id',
    ])('%s', keyDerivationAlgorithm => {
        it.each(apiCases.encrypt.withPlaintextChunk)('%s', async (_, encryptFn) => {
            const options: EncryptOptions = {
                keyDerivation: {
                    algorithm: keyDerivationAlgorithm,
                },
            };
            await expect(encryptFn({ password: '', options })).resolves.not.toThrow();
        });
        shouldBeDecryptableTest({ keyDerivation: { algorithm: keyDerivationAlgorithm } });
    });
    describe('unknown algorithm', () => {
        it.each(apiCases.encrypt.withPlaintextChunk)('%s', async (_, encryptFn) => {
            const options: EncryptOptions = {
                keyDerivation: {
                    // @ts-expect-error TS2322
                    algorithm: 'bar',
                },
            };
            await expect(encryptFn({ password: '', options })).rejects.toThrowWithMessage(
                TypeError,
                `Unknown KDF (Key Derivation Function) algorithm was received: bar`,
            );
        });
    });
    describe('invalid type', () => {
        it.each(apiCases.encrypt.withPlaintextChunk)('%s', async (_, encryptFn) => {
            const options: EncryptOptions = {
                // @ts-expect-error TS2322: Type 'number' is not assignable to type 'Argon2Options'.
                keyDerivation: 42,
            };
            await expect(encryptFn({ password: '', options })).rejects.toThrowWithMessage(
                TypeError,
                `Unknown deriveKey options was received: 42`,
            );
        });
    });
    describe('invalid type algorithm', () => {
        it.each(apiCases.encrypt.withPlaintextChunk)('%s', async (_, encryptFn) => {
            const options: EncryptOptions = {
                keyDerivation: {
                    // @ts-expect-error TS2322: Type 'number' is not assignable to type '"argon2d" | "argon2id"'.
                    algorithm: 42,
                },
            };
            await expect(encryptFn({ password: '', options })).rejects.toThrowWithMessage(
                TypeError,
                `Unknown KDF (Key Derivation Function) algorithm was received: 42`,
            );
        });
    });
});

describe('should support compression algorithms', () => {
    describe.each<CompressOptions | CompressOptions['algorithm']>([
        'gzip',
        'brotli',
    ])('%s', compressAlgorithm => {
        const password = 'quux';
        it.each(apiCases.encrypt.withPlaintextChunk)('%s', async (_, encryptFn) => {
            const options: EncryptOptions = { compress: compressAlgorithm };
            const compressedEncryptedDataAsync = encryptFn({ password, options });
            await expect(compressedEncryptedDataAsync).resolves.not.toThrow();

            const uncompressedEncryptedData = await encryptFn({ password });
            expect(await compressedEncryptedDataAsync).toBeLessThanByteSize(uncompressedEncryptedData);
        });
        shouldBeDecryptableTest({ compress: compressAlgorithm });
    });
    describe('unknown algorithm', () => {
        it.each(apiCases.encrypt.withPlaintextChunk)('%s', async (_, encryptFn) => {
            const options: EncryptOptions = {
                // @ts-expect-error TS2322
                compress: 'hoge',
            };
            await expect(encryptFn({ password: '', options })).rejects.toThrowWithMessage(
                TypeError,
                `Unknown compress algorithm was received: hoge`,
            );
        });
    });
    describe('invalid type', () => {
        it.each(apiCases.encrypt.withPlaintextChunk)('%s', async (_, encryptFn) => {
            const options: EncryptOptions = {
                // @ts-expect-error TS2322: Type 'number' is not assignable to type '"gzip" | "brotli" | CompressOptions | undefined'.
                compress: 42,
            };
            await expect(encryptFn({ password: '', options })).rejects.toThrowWithMessage(
                TypeError,
                `Unknown compress algorithm was received: 42`,
            );
        });
    });
});

describe('wrong password should fail', () => {
    const password1 = 'dragon';
    const password2 = 'flying lizard';
    describe.each<CryptoAlgorithmName>([
        'aes-256-gcm',
        'chacha20-poly1305',
    ])('%s', algorithm => {
        const encryptedDataAsync = encrypt('hoge', password1, { algorithm });
        it.each(apiCases.decrypt)('%s', async (_, decryptFn) => {
            const encryptedData = await encryptedDataAsync;
            await expect(decryptFn({ encryptedData, password: password2 })).rejects.toThrowWithMessage(
                Error,
                `Unsupported state or unable to authenticate data`,
            );
        });
    });
});
