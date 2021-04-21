import { encrypt } from '../src';

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
        expect(encryptedData1.equals(encryptedData2)).toBeFalse();
        expect(encryptedData1.equals(encryptedData3)).toBeFalse();
        expect(encryptedData2.equals(encryptedData3)).toBeFalse();
    });

    describe('should support one or more encryption algorithms', () => {
        it('aes-256-gcm', async () => {
            await expect(encrypt(cleartext, password, { algorithm: 'aes-256-gcm' })).toResolve();
        });
        it('chacha20-poly1305', async () => {
            await expect(encrypt(cleartext, password, { algorithm: 'chacha20-poly1305' })).toResolve();
        });
        it('unknown', async () => {
            const resultPromise = encrypt(cleartext, password, {
                // @ts-expect-error TS2322
                algorithm: 'foo',
            });
            await expect(resultPromise).rejects.toThrow(TypeError);
            await expect(resultPromise).rejects.toThrow(
                new TypeError(`Unknown algorithm was received: foo`),
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
            const resultPromise = encrypt(cleartext, password, {
                keyDerivation: {
                    // @ts-expect-error TS2322
                    algorithm: 'bar',
                },
            });
            await expect(resultPromise).rejects.toThrow(TypeError);
            await expect(resultPromise).rejects.toThrow(
                new TypeError(`Unknown KDF (Key Derivation Function) algorithm was received: bar`),
            );
        });
    });

    describe('compression should be supported', () => {
        it('gzip', async () => {
            const uncompressedEncryptedData = await encrypt(cleartext, password);
            const compressedEncryptedData = await encrypt(cleartext, password, { compress: 'gzip' });
            expect(compressedEncryptedData.byteLength).toBeLessThan(uncompressedEncryptedData.byteLength);
        });
        it('brotli', async () => {
            const uncompressedEncryptedData = await encrypt(cleartext, password);
            const compressedEncryptedData = await encrypt(cleartext, password, { compress: 'brotli' });
            expect(compressedEncryptedData.byteLength).toBeLessThan(uncompressedEncryptedData.byteLength);
        });
        it('unknown', async () => {
            const resultPromise = encrypt(cleartext, password, {
                // @ts-expect-error TS2322
                compress: 'hoge',
            });
            await expect(resultPromise).rejects.toThrow(TypeError);
            await expect(resultPromise).rejects.toThrow(
                new TypeError(`Unknown compress algorithm was received: hoge`),
            );
        });
    });
});
