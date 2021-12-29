import * as stream from 'stream';

import { streamToBuffer } from '@jorgeferrero/stream-to-buffer';

import {
    CompressOptions,
    CryptoAlgorithmName,
    decrypt,
    encrypt,
    EncryptOptions,
    encryptStream,
    KeyDerivationOptions,
} from '../src/index.node';
import { createStreamFromArrayBufferView } from './helpers/stream';

const cleartext = Buffer.from('123456789'.repeat(20));
const password = 'dragon';

describe('encrypt()', () => {
    it('input and output must not be the same', async () => {
        const encryptedData = await encrypt(cleartext, password);
        expect(cleartext.equals(encryptedData)).toBeFalse();
    });

    it('never generate same data', async () => {
        const encryptedData1 = await encrypt(cleartext, password);
        const encryptedData2 = await encrypt(cleartext, password);
        const encryptedData3 = await encrypt(cleartext, password);
        expect(encryptedData1).not.toBytesEqual(encryptedData2);
        expect(encryptedData1).not.toBytesEqual(encryptedData3);
        expect(encryptedData2).not.toBytesEqual(encryptedData3);
    });

    describe('should support one or more encryption algorithms', () => {
        it('aes-256-gcm', async () => {
            await expect(encrypt(cleartext, password, { algorithm: 'aes-256-gcm' })).toResolve();
        });
        it('chacha20-poly1305', async () => {
            await expect(encrypt(cleartext, password, { algorithm: 'chacha20-poly1305' })).toResolve();
        });
        it('unknown', async () => {
            await expect(encrypt(cleartext, password, {
                // @ts-expect-error TS2322
                algorithm: 'foo',
            })).rejects.toThrowWithMessage(
                TypeError,
                `Unknown algorithm was received: foo`,
            );
        });
    });

    describe('should be able to specify the key derivation function', () => {
        it('argon2d', async () => {
            await expect(encrypt(cleartext, password, { keyDerivation: { algorithm: 'argon2d' } })).toResolve();
        });
        it('argon2id', async () => {
            await expect(encrypt(cleartext, password, { keyDerivation: { algorithm: 'argon2id' } })).toResolve();
        });
        it('unknown', async () => {
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

    describe('compression should be supported', () => {
        it('gzip', async () => {
            const uncompressedEncryptedData = await encrypt(cleartext, password);
            const compressedEncryptedData = await encrypt(cleartext, password, { compress: 'gzip' });
            expect(compressedEncryptedData).toBeLessThanByteSize(uncompressedEncryptedData);
        });
        it('brotli', async () => {
            const uncompressedEncryptedData = await encrypt(cleartext, password);
            const compressedEncryptedData = await encrypt(cleartext, password, { compress: 'brotli' });
            expect(compressedEncryptedData).toBeLessThanByteSize(uncompressedEncryptedData);
        });
        it('unknown', async () => {
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

describe('decrypt()', () => {
    describe('should be decryptable', () => {
        describe.each<[string, (options: EncryptOptions) => Promise<Uint8Array>]>([
            [
                'single chunk',
                async options => await encrypt(cleartext, password, options),
            ],
            [
                'multi chunk',
                async options =>
                    await streamToBuffer(
                        stream.pipeline(
                            createStreamFromArrayBufferView(cleartext, 2),
                            encryptStream(password, options),
                            () => {
                                //
                            },
                        ),
                    ),
            ],
        ])('%s', (_, encrypt) => {
            describe('encryption algorithms', () => {
                it.each<CryptoAlgorithmName>([
                    'aes-256-gcm',
                    'chacha20-poly1305',
                ])('%s', async algorithm => {
                    const encryptedData = await encrypt({ algorithm });
                    const decryptedData = await decrypt(encryptedData, password);
                    expect(decryptedData).toBytesEqual(cleartext);
                });
            });
            describe('key derivation function', () => {
                it.each<KeyDerivationOptions['algorithm']>([
                    'argon2d',
                    'argon2id',
                ])('%s', async keyDerivationAlgorithm => {
                    const encryptedData = await encrypt({ keyDerivation: { algorithm: keyDerivationAlgorithm } });
                    const decryptedData = await decrypt(encryptedData, password);
                    expect(decryptedData).toBytesEqual(cleartext);
                });
            });
            describe('compression', () => {
                it.each<CompressOptions | CompressOptions['algorithm']>([
                    'gzip',
                    'brotli',
                ])('%s', async compressAlgorithm => {
                    const encryptedData = await encrypt({ compress: compressAlgorithm });
                    const decryptedData = await decrypt(encryptedData, password);
                    expect(decryptedData).toBytesEqual(cleartext);
                });
            });
        });
    });
    describe('wrong password should fail', () => {
        const password2 = `${password} `;
        it.each<CryptoAlgorithmName>([
            'aes-256-gcm',
            'chacha20-poly1305',
        ])('%s', async algorithm => {
            const encryptedData = await encrypt(cleartext, password, { algorithm });
            await expect(decrypt(encryptedData, password2)).rejects.toThrowWithMessage(
                Error,
                `Unsupported state or unable to authenticate data`,
            );
        });
    });
});
