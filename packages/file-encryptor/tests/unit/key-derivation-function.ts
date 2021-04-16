import { randomBytes } from 'crypto';

import { deriveKey, KeyDerivationOptions } from '../../src/key-derivation-function';

describe('deriveKey()', () => {
    describe('generate key', () => {
        const password = 'Hoge Fuga';
        const salt = randomBytes(8);

        it.each([...Array(20).keys()].map(l => l + 4))('keyLengthBytes: %i', async keyLengthBytes => {
            const { key } = await deriveKey(password, salt, keyLengthBytes);
            expect(key.byteLength).toBe(keyLengthBytes);
            const { key: key2 } = await deriveKey(password, salt, keyLengthBytes);
            expect(key2).toStrictEqual(key);
            const { key: key3 } = await deriveKey(password, salt, keyLengthBytes);
            expect(key3).toStrictEqual(key);
        });
    });

    it('unknown algorithm', async () => {
        const algorithm = 'foooooooooooooo';
        const password = 'Hoge Fuga';
        const salt = randomBytes(8);
        // @ts-expect-error TS2322: Type '"foooooooooooooo"' is not assignable to type '"argon2d" | "argon2id" | undefined'.
        const options: KeyDerivationOptions = { algorithm };

        const resultPromise = deriveKey(password, salt, 12, options);
        await expect(resultPromise).rejects.toThrow(TypeError);
        await expect(resultPromise).rejects.toThrow(
            `Unknown KDF (Key Derivation Function) algorithm was received: ${algorithm}`,
        );
    });
});
