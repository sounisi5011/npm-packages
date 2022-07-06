import {
    CompressOptions,
    CryptoAlgorithmName,
    decrypt,
    decryptIterator,
    encrypt,
    encryptIterator,
    EncryptOptions,
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

describe('output value must be a Promise giving a Buffer object', () => {
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

describe('output value must be an AsyncIterableIterator giving a a Buffer object', () => {
    type Output = AsyncIterableIterator<Buffer>;
    describe.each<[string, Array<[string, () => Output | Promise<Output>]>]>([
        [
            'encryptIterator()',
            cleartextChunkCases.map((
                [label, cleartextChunkList],
            ) => [label, () => encryptIterator(password)(cleartextChunkList)]),
        ],
        [
            'decryptIterator()',
            encryptedDataChunkIterCases.map(([label, genEncryptedDataChunkIter]) => [label, async () => {
                const encryptedDataChunkIter = await genEncryptedDataChunkIter();
                return decryptIterator(password)(encryptedDataChunkIter);
            }]),
        ],
    ])('%s', (_, outputCases) => {
        it.each(outputCases)('%s', async (_, genOutput) => {
            expect.hasAssertions();

            const output = await genOutput();
            for await (const chunk of output) {
                expect(chunk).toBeInstanceOf(Buffer);
            }
        });
    });
});

describe('input and output must not be the same', () => {
    it('encrypt()', async () => {
        const encryptedData = await encrypt(cleartext, password);
        expect(cleartext.equals(encryptedData)).toBeFalse();
    });
});

describe('never generate same data', () => {
    it('encrypt()', async () => {
        const encryptedData1 = await encrypt(cleartext, password);
        const encryptedData2 = await encrypt(cleartext, password);
        const encryptedData3 = await encrypt(cleartext, password);
        expect(encryptedData1.equals(encryptedData2)).toBeFalse();
        expect(encryptedData1.equals(encryptedData3)).toBeFalse();
        expect(encryptedData2.equals(encryptedData3)).toBeFalse();
    });
});

describe('should support one or more encryption algorithms', () => {
    describe.each<CryptoAlgorithmName>([
        'aes-256-gcm',
        'chacha20-poly1305',
    ])('%s', algorithm => {
        it('encrypt()', async () => {
            await expect(encrypt(cleartext, password, { algorithm })).toResolve();
        });
    });
    describe('unknown', () => {
        it('encrypt()', async () => {
            await expect(encrypt(cleartext, password, {
                // @ts-expect-error TS2322
                algorithm: 'foo',
            })).rejects.toThrowWithMessage(
                TypeError,
                `Unknown algorithm was received: foo`,
            );
        });
    });
});

describe('should be able to specify the key derivation function', () => {
    describe.each<KeyDerivationOptions['algorithm']>([
        'argon2d',
        'argon2id',
    ])('%s', keyDerivationAlgorithm => {
        it('encrypt()', async () => {
            await expect(encrypt(cleartext, password, { keyDerivation: { algorithm: keyDerivationAlgorithm } }))
                .toResolve();
        });
    });
    describe('unknown', () => {
        it('encrypt()', async () => {
            await expect(encrypt(cleartext, password, {
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

describe('compression should be supported', () => {
    const uncompressedEncryptedDataAsync = encrypt(cleartext, password);

    describe.each<CompressOptions | CompressOptions['algorithm']>([
        'gzip',
        'brotli',
    ])('%s', compressAlgorithm => {
        it('encrypt()', async () => {
            const compressedEncryptedData = await encrypt(cleartext, password, { compress: compressAlgorithm });
            expect(compressedEncryptedData).toBeLessThanByteSize(await uncompressedEncryptedDataAsync);
        });
    });
    describe('unknown', () => {
        it('encrypt()', async () => {
            await expect(encrypt(cleartext, password, {
                // @ts-expect-error TS2322
                compress: 'hoge',
            })).rejects.toThrowWithMessage(
                TypeError,
                `Unknown compress algorithm was received: hoge`,
            );
        });
    });
});

describe('should be decryptable', () => {
    describe.each(encryptedDataChunkIterCases)('%s', (_, genEncryptedDataChunkIter) => {
        const encryptFn = async (options: EncryptOptions): Promise<Buffer> =>
            await iterable2buffer(await genEncryptedDataChunkIter(options));

        describe('encryption algorithms', () => {
            describe.each<CryptoAlgorithmName>([
                'aes-256-gcm',
                'chacha20-poly1305',
            ])('%s', algorithm => {
                const encryptedDataAsync = encryptFn({ algorithm });
                it('decrypt()', async () => {
                    const decryptedData = await decrypt(await encryptedDataAsync, password);
                    expect(decryptedData.equals(cleartext)).toBeTrue();
                });
            });
        });
        describe('key derivation function', () => {
            describe.each<KeyDerivationOptions['algorithm']>([
                'argon2d',
                'argon2id',
            ])('%s', keyDerivationAlgorithm => {
                const encryptedDataAsync = encryptFn({ keyDerivation: { algorithm: keyDerivationAlgorithm } });
                it('decrypt()', async () => {
                    const decryptedData = await decrypt(await encryptedDataAsync, password);
                    expect(decryptedData.equals(cleartext)).toBeTrue();
                });
            });
        });
        describe('compression', () => {
            describe.each<CompressOptions | CompressOptions['algorithm']>([
                'gzip',
                'brotli',
            ])('%s', compressAlgorithm => {
                const encryptedDataAsync = encryptFn({ compress: compressAlgorithm });
                it('decrypt()', async () => {
                    const decryptedData = await decrypt(await encryptedDataAsync, password);
                    expect(decryptedData.equals(cleartext)).toBeTrue();
                });
            });
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
        it('decrypt()', async () => {
            await expect(decrypt(await encryptedDataAsync, password2)).rejects.toThrowWithMessage(
                Error,
                `Unsupported state or unable to authenticate data`,
            );
        });
    });
});
