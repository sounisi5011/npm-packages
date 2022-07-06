import {
    CompressOptions,
    CryptoAlgorithmName,
    decrypt,
    decryptIterator,
    encrypt,
    encryptIterator,
    EncryptOptions,
    InputDataType,
    KeyDerivationOptions,
} from '../src';
import { bufferChunk, iterable2buffer } from './helpers';

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

describe('output value must be a `Promise<Buffer>`', () => {
    type Output = Promise<Buffer>;
    it.each<[string, () => [Output] | Promise<[Output]>]>([
        ['encrypt()', () => [encrypt(cleartext, password)]],
        ['decrypt()', async () => {
            const encryptedData = await encrypt(cleartext, password);
            return [decrypt(encryptedData, password)];
        }],
    ])('%s', async (_, genOutput) => {
        const [output] = await genOutput();
        expect(output).toBeInstanceOf(Promise);
        await expect(output).resolves.toBeInstanceOf(Buffer);
    });
});

describe('output value must be an `AsyncIterableIterator<Buffer>`', () => {
    type Output = AsyncIterableIterator<Buffer>;
    it.each<readonly [string, () => Output | Promise<Output>]>([
        ...cleartextChunkCases.map((
            [label, cleartextChunkList],
        ) => [`encryptIterator() [${label}]`, () => encryptIterator(password)(cleartextChunkList)] as const),
        ...encryptedDataChunkIterCases.map(([label, genEncryptedDataChunkIter]) =>
            [`decryptIterator() [${label}]`, async () => {
                const encryptedDataChunkIter = await genEncryptedDataChunkIter();
                return decryptIterator(password)(encryptedDataChunkIter);
            }] as const
        ),
    ])('%s', async (_, genOutput) => {
        expect.hasAssertions();

        const output = await genOutput();
        for await (const chunk of output) {
            expect(chunk).toBeInstanceOf(Buffer);
        }
    });
});

const encryptCases: Array<readonly [string, (options?: EncryptOptions) => Promise<Buffer>]> = [
    ['encrypt()', async options => await encrypt(cleartext, password, options)],
    ...cleartextChunkCases.map(([label, cleartextChunkList]) =>
        [
            `encryptIterator() [input: ${label}]`,
            async (options?: EncryptOptions) =>
                await iterable2buffer(encryptIterator(password, options)(cleartextChunkList)),
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
    const password2 = `${password} `;
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
