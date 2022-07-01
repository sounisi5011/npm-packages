import { randomBytes } from 'crypto';

import { cryptoAlgorithmNameList } from '../../src/core/types/crypto';
import { getCryptoAlgorithm } from '../../src/runtimes/node/cipher';

describe.each(cryptoAlgorithmNameList)(
    'getCryptoAlgorithm(%j)',
    cryptoAlgorithmName => {
        const algorithm = getCryptoAlgorithm(cryptoAlgorithmName);

        it('exists algorithm', () => {
            expect(algorithm).toBeDefined();
        });

        if (!algorithm) return;

        const key = randomBytes(algorithm.keyLength);
        const nonce = randomBytes(algorithm.nonceLength);
        const cleartext = randomBytes(42);

        it('encrypt()', async () => {
            await expect(algorithm.encrypt({ key, nonce, cleartext })).resolves.not.toThrow();
        });

        it('decrypt()', async () => {
            const { ciphertext, authTag } = await algorithm.encrypt({ key, nonce, cleartext });

            await expect((async () => {
                const result = algorithm.decrypt({ key, nonce, authTag, ciphertext: [ciphertext] });
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                for await (const _ of result);
            })()).resolves.not.toThrow();
        });

        it('match cleartext and ciphertext', async () => {
            const { ciphertext, authTag } = await algorithm.encrypt({ key, nonce, cleartext });

            const cleartext2 = await (async () => {
                const result = algorithm.decrypt({ key, nonce, authTag, ciphertext: [ciphertext] });
                const cleartextPartList: Uint8Array[] = [];
                for await (const cleartextPart of result) cleartextPartList.push(cleartextPart);
                return Buffer.concat(cleartextPartList);
            })();

            expect(cleartext2).toBytesEqual(cleartext);
            expect(cleartext).toBytesEqual(cleartext2);
        });

        describe('decryption fail', () => {
            it('different key', async () => {
                const { ciphertext, authTag } = await algorithm.encrypt({ key, nonce, cleartext });
                const key2 = randomBytes(algorithm.keyLength);

                await expect((async () => {
                    const result = algorithm.decrypt({ key: key2, nonce, authTag, ciphertext: [ciphertext] });
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    for await (const _ of result);
                })()).rejects.toThrow(/^Unsupported state or unable to authenticate data$/);
            });
            it('different nonce', async () => {
                const { ciphertext, authTag } = await algorithm.encrypt({ key, nonce, cleartext });
                const nonce2 = randomBytes(algorithm.nonceLength);

                await expect((async () => {
                    const result = algorithm.decrypt({ key, nonce: nonce2, authTag, ciphertext: [ciphertext] });
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    for await (const _ of result);
                })()).rejects.toThrow(/^Unsupported state or unable to authenticate data$/);
            });
        });
    },
);
