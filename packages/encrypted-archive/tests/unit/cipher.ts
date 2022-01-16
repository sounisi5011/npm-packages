import { randomBytes } from 'crypto';

import type { CryptoAlgorithmName } from '../../src/core/types/crypto';
import { getCryptoAlgorithm } from '../../src/node/cipher';

const algorithmNameList = ['aes-256-gcm', 'chacha20-poly1305'] as const;
const cases = algorithmNameList
    .map(algorithmName => [algorithmName, getCryptoAlgorithm(algorithmName)] as const)
    .filter(<K, V>(value: readonly [K, V | undefined]): value is [K, V] => value[1] !== undefined);

describe.each(cases)(
    'getCryptoAlgorithm(algorithmName: %o)',
    (_, algorithm) => {
        const key = randomBytes(algorithm.keyLength);
        const nonce = randomBytes(algorithm.nonceLength);
        const cleartext = randomBytes(42);

        it('encrypt()', async () => {
            const result = algorithm.encrypt({ key, nonce, cleartext });
            await expect(result).toResolve();
        });

        it('decrypt()', async () => {
            const { ciphertext, authTag } = await algorithm.encrypt({ key, nonce, cleartext });
            const result = algorithm.decrypt({ key, nonce, authTag, ciphertext });
            await expect(result).toResolve();
        });

        it('match cleartext and ciphertext', async () => {
            const { ciphertext, authTag } = await algorithm.encrypt({ key, nonce, cleartext });
            const { cleartext: cleartext2 } = await algorithm.decrypt({ key, nonce, authTag, ciphertext });
            expect(cleartext2).toBytesEqual(cleartext);
        });

        describe('decryption fail', () => {
            it('different key', async () => {
                const { ciphertext, authTag } = await algorithm.encrypt({ key, nonce, cleartext });
                const key2 = randomBytes(algorithm.keyLength);
                const result = algorithm.decrypt({ key: key2, nonce, authTag, ciphertext });
                await expect(result).rejects.toThrowWithMessage(
                    Error,
                    'Unsupported state or unable to authenticate data',
                );
            });
            it('different nonce', async () => {
                const { ciphertext, authTag } = await algorithm.encrypt({ key, nonce, cleartext });
                const nonce2 = randomBytes(algorithm.nonceLength);
                const result = algorithm.decrypt({ key, nonce: nonce2, authTag, ciphertext });
                await expect(result).rejects.toThrowWithMessage(
                    Error,
                    'Unsupported state or unable to authenticate data',
                );
            });
        });
    },
);

describe('unknown algorithm', () => {
    it('should return `undefined`', () => {
        // @ts-expect-error TS2322: Type '"foo"' is not assignable to type 'CryptoAlgorithmName'.
        const algorithmName: CryptoAlgorithmName = 'foo';
        expect(getCryptoAlgorithm(algorithmName)).toBeUndefined();
    });
});
