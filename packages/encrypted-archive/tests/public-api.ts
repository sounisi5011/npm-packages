import escapeStringRegexp from 'escape-string-regexp';
import wordJoin from 'word-join';

import type { CompressOptions, CryptoAlgorithmName, EncryptOptions, InputDataType, KeyDerivationOptions } from '../src';
import { decrypt, decryptIterator, decryptStream, encrypt, encryptIterator, encryptStream } from '../src';
import { bufferChunk, genInputTypeCases, genIterableTypeCases, iterable2buffer } from './helpers';
import { runDuplex } from './helpers/stream';

type EncryptCase<TCleartext = InputDataType, TReturn = Promise<Buffer>> = [
    string,
    (arg: { cleartext: TCleartext; password: InputDataType; options?: EncryptOptions }) => TReturn,
];

const testValue = (() => {
    const cleartextBuf = Buffer.from('123456789'.repeat(20));
    const multiChunkList = bufferChunk(cleartextBuf, 7);
    const encryptedData = Object.assign(
        Buffer.from(
            'kaDBAT4IARIMbPZU2oEBAD4AAAAAGhCe4H1n0Pyq9RSnQ9WiavW0ICAqECh1CdqWFCcpvBBpTG9BfaR6BhADGAwgAQQ33rvp',
            'base64',
        ),
        { password: 'dragon' },
    );
    const encryptedDataChunkIterCases: Array<EncryptCase<Buffer, Promise<Iterable<Buffer>> | AsyncIterable<Buffer>>> = [
        ['single chunk', async ({ cleartext, password, options }) => [await encrypt(cleartext, password, options)]],
        [
            'multi chunk',
            ({ cleartext, password, options }) => encryptIterator(password, options)(bufferChunk(cleartext, 7)),
        ],
    ];

    return {
        cleartext: Object.assign(cleartextBuf, {
            multiChunkList,
            chunkCases: [
                ['single chunk', [cleartextBuf]],
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
            async ({ cleartext, password, options }) =>
                await iterable2buffer(encryptIterator(password, options)(cleartext)),
        ],
        [
            'encryptStream()',
            async ({ cleartext, password, options }) =>
                Buffer.concat(await runDuplex(cleartext, encryptStream(password, options))),
        ],
    ];
    const encryptCasesOnlyRawInput: EncryptCase[] = [
        [
            'encrypt()',
            async ({ cleartext, password, options }) => await encrypt(cleartext, password, options),
        ],
    ];
    const encryptCases = [
        ...encryptCasesOnlyRawInput,
        ...encryptCasesAllowIterInput
            .map<EncryptCase>(([label, fn]) => [label, async arg => await fn({ ...arg, cleartext: [arg.cleartext] })]),
    ];

    type EncryptCaseWithoutCleartextType = [
        string,
        (arg: { password: InputDataType; options?: EncryptOptions }) => Promise<Buffer>,
        { expectedCleartext: Buffer },
    ];
    const expectedCleartext = testValue.cleartext;
    const encryptCasesWithCleartextChunk = [
        ...encryptCasesOnlyRawInput.map<EncryptCaseWithoutCleartextType>(([label, fn]) => [
            label,
            async arg => await fn({ ...arg, cleartext: expectedCleartext }),
            { expectedCleartext },
        ]),
        ...expectedCleartext.chunkCases.flatMap(([cleartextLabel, cleartextChunkList]) =>
            encryptCasesAllowIterInput.map<EncryptCaseWithoutCleartextType>(([apiLabel, fn]) => [
                `${apiLabel} [input: ${cleartextLabel}]`,
                async arg => await fn({ ...arg, cleartext: cleartextChunkList }),
                { expectedCleartext },
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
            withCleartextChunk: encryptCasesWithCleartextChunk,
        }),
        decrypt: Object.assign(decryptCases, {
            allowIterInput: decryptCasesAllowIterInput,
        }),
    };
})();

describe('input should allow the types described in documentation', () => {
    type Input = string | Buffer | NodeJS.TypedArray | DataView | ArrayBuffer | SharedArrayBuffer;

    describe('cleartext', () => {
        const cleartextInput = '12345678';
        const password = 'foo';
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
                const encryptedDataListAsync = runDuplex([cleartext], encryptStream(password));
                await expect(encryptedDataListAsync).resolves.not.toThrow();

                const encryptedData = Buffer.concat(await encryptedDataListAsync);
                const decryptedData = await decrypt(encryptedData, password);
                expect(decryptedData.equals(expectedCleartext)).toBeTrue();
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
        const { cleartext } = testValue;
        const originalPassword = '12345678';
        const passwordCases = genInputTypeCases(originalPassword);
        const encryptedDataAsync = encrypt(cleartext, originalPassword);

        describe.each(apiCases.encrypt)('%s', (_, encryptFn) => {
            it.each<[string, Input]>(passwordCases)('%s', async (_, passwordValue) => {
                const encryptedDataAsync = encryptFn({ cleartext, password: passwordValue });
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
    const cleartext = '';
    const encryptedData = '';
    const password = '';

    describe('cleartext', () => {
        describe.each(apiCases.encrypt)('%s', (encryptFnName, encryptFn) => {
            it.each(genInvalidInputCases(encryptFnName))('%o', async invalidInput => {
                // @ts-expect-error TS2322: Type 'unknown' is not assignable to type 'InputDataType'.
                const cleartext: InputDataType = invalidInput;
                const waitFinish = encryptFn({ cleartext, password });
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
                const waitFinish = encryptOrDecryptFn({ cleartext, encryptedData, password });
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
        describe.each(testValue.cleartext.chunkCases)('%s', (_, cleartextChunkList) => {
            implementsAsyncIterableIteratorTest(() => encryptIterator('')(cleartextChunkList));
        });
    });
    describe('decryptIterator()', () => {
        describe.each(testValue.encryptedDataChunkIterCases)('%s', (_, genEncryptedDataChunkIter) => {
            implementsAsyncIterableIteratorTest(async () => {
                const password = 'bar';
                const encryptedDataChunkIter = await genEncryptedDataChunkIter({
                    cleartext: testValue.cleartext,
                    password,
                });
                return decryptIterator(password)(encryptedDataChunkIter);
            });
        });
    });
});

describe('output Stream must return `Buffer` when read', () => {
    describe('encryptStream()', () => {
        it.each(testValue.cleartext.chunkCases)('%s', async (_, cleartextChunkList) => {
            expect.hasAssertions();

            const chunkList = await runDuplex(cleartextChunkList, encryptStream(''));
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
                cleartext: testValue.cleartext,
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
    it.each(apiCases.encrypt.withCleartextChunk)('%s', async (_, encryptFn, { expectedCleartext }) => {
        const encryptedData = await encryptFn({ password: '' });
        expect(expectedCleartext.equals(encryptedData)).toBeFalse();
    });
});

describe('never generate same data', () => {
    it.each(apiCases.encrypt.withCleartextChunk)('%s', async (_, encryptFn) => {
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
        const cleartext = testValue.cleartext;
        const password = 'qux';
        it.each<TestCase>(
            apiCases.decrypt.map<TestCase>(([decryptLabel, decryptFn]) => [
                `encrypt() |> ${decryptLabel}`,
                async () => {
                    const encryptedData = await encrypt(cleartext, password, options);
                    return await decryptFn({ encryptedData, password });
                },
            ]),
        )('%s', async (_, decryptFn) => {
            const decryptedData = await decryptFn();
            expect(decryptedData.equals(cleartext)).toBeTrue();
        });
        describe.each<TestCase<[cleartextChunkList: readonly Buffer[]]>>([
            [
                `encryptIterator() |> decrypt()`,
                async cleartextChunkList => {
                    const encryptedDataChunkIter = encryptIterator(password, options)(cleartextChunkList);
                    const encryptedData = await iterable2buffer(encryptedDataChunkIter);
                    return await decrypt(encryptedData, password);
                },
            ],
            ...apiCases.decrypt.allowIterInput.map<TestCase<[readonly Buffer[]]>>(([decryptLabel, decryptFn]) => [
                `encryptIterator() |> ${decryptLabel}`,
                async cleartextChunkList => {
                    const encryptedDataChunkIter = encryptIterator(password, options)(cleartextChunkList);
                    return await decryptFn({ encryptedData: encryptedDataChunkIter, password });
                },
            ]),
            [
                `encryptStream() |> decrypt()`,
                async cleartextChunkList => {
                    const encryptedDataChunkIter = await runDuplex(
                        cleartextChunkList,
                        encryptStream(password, options),
                    );
                    const encryptedData = await iterable2buffer(encryptedDataChunkIter);
                    return await decrypt(encryptedData, password);
                },
            ],
            [
                `encryptStream() |> decryptIterator()`,
                async cleartextChunkList => {
                    const encryptedDataChunkIter = await runDuplex(
                        cleartextChunkList,
                        encryptStream(password, options),
                    );
                    return await iterable2buffer(decryptIterator(password)(encryptedDataChunkIter));
                },
            ],
            [
                `encryptStream() |> decryptStream()`,
                async cleartextChunkList => {
                    return Buffer.concat(
                        await runDuplex(
                            cleartextChunkList,
                            encryptStream(password, options),
                            decryptStream(password),
                        ),
                    );
                },
            ],
        ])('%s', (_, decryptFn) => {
            it.each(cleartext.chunkCases)('input: %s', async (_, cleartextChunkList) => {
                const decryptedData = await decryptFn(cleartextChunkList);
                expect(decryptedData.equals(cleartext)).toBeTrue();
            });
        });
    });
};

describe('should support encryption algorithms', () => {
    describe.each<CryptoAlgorithmName>([
        'aes-256-gcm',
        'chacha20-poly1305',
    ])('%s', algorithm => {
        it.each(apiCases.encrypt.withCleartextChunk)('%s', async (_, encryptFn) => {
            const options: EncryptOptions = { algorithm };
            await expect(encryptFn({ password: '', options })).resolves.not.toThrow();
        });
        shouldBeDecryptableTest({ algorithm });
    });
    describe('unknown algorithm', () => {
        it.each(apiCases.encrypt.withCleartextChunk)('%s', async (_, encryptFn) => {
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
});

describe('should support key derivation functions', () => {
    describe.each<KeyDerivationOptions['algorithm']>([
        'argon2d',
        'argon2id',
    ])('%s', keyDerivationAlgorithm => {
        it.each(apiCases.encrypt.withCleartextChunk)('%s', async (_, encryptFn) => {
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
        it.each(apiCases.encrypt.withCleartextChunk)('%s', async (_, encryptFn) => {
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
});

describe('should support compression algorithms', () => {
    describe.each<CompressOptions | CompressOptions['algorithm']>([
        'gzip',
        'brotli',
    ])('%s', compressAlgorithm => {
        const password = 'quux';
        it.each(apiCases.encrypt.withCleartextChunk)('%s', async (_, encryptFn) => {
            const options: EncryptOptions = { compress: compressAlgorithm };
            const compressedEncryptedDataAsync = encryptFn({ password, options });
            await expect(compressedEncryptedDataAsync).resolves.not.toThrow();

            const uncompressedEncryptedData = await encryptFn({ password });
            expect(await compressedEncryptedDataAsync).toBeLessThanByteSize(uncompressedEncryptedData);
        });
        shouldBeDecryptableTest({ compress: compressAlgorithm });
    });
    describe('unknown algorithm', () => {
        it.each(apiCases.encrypt.withCleartextChunk)('%s', async (_, encryptFn) => {
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
