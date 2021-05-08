import { randomBytes } from 'crypto';

import { getKDF, KeyDerivationOptions } from '../../src/key-derivation-function';
import '../helpers/jest-matchers';

describe('getKDF()', () => {
    describe('generate key', () => {
        const { deriveKey, saltLength } = getKDF(undefined);
        const password = 'Hoge Fuga';
        const salt = randomBytes(saltLength);

        it.each([...Array(20).keys()].map(l => l + 4))('keyLengthBytes: %i', async keyLengthBytes => {
            const { key } = await deriveKey(password, salt, keyLengthBytes);
            expect(key.byteLength).toBeByteSize(keyLengthBytes);
            const { key: key2 } = await deriveKey(password, salt, keyLengthBytes);
            expect(key2).toStrictEqual(key);
            const { key: key3 } = await deriveKey(password, salt, keyLengthBytes);
            expect(key3).toStrictEqual(key);
        });
    });

    it('unknown algorithm', async () => {
        const algorithm = 'foooooooooooooo';
        // @ts-expect-error TS2322: Type '"foooooooooooooo"' is not assignable to type '"argon2d" | "argon2id" | undefined'.
        const options: KeyDerivationOptions = { algorithm };

        expect(() => getKDF(options)).toThrowWithMessage(
            TypeError,
            `Unknown KDF (Key Derivation Function) algorithm was received: ${algorithm}`,
        );
    });
});
