import { randomBytes } from 'crypto';

import { cryptAlgorithmMap } from '../../src/cipher';

describe.each([...cryptAlgorithmMap.values()].map(algorithm => [algorithm.name, algorithm] as const))(
    '%s',
    (_, algorithm) => {
        const key = randomBytes(algorithm.keyLength);
        const nonce = randomBytes(algorithm.nonceLength);
        const cleartext = randomBytes(42);

        it('createCipher()', async () => {
            let cipher: ReturnType<typeof algorithm.createCipher>;
            expect(() => {
                cipher = algorithm.createCipher(key, nonce);
            }).not.toThrow();
            expect(() => cipher.update(cleartext)).not.toThrow();
            expect(() => cipher.final()).not.toThrow();
        });

        it('createDecipher()', async () => {
            const cipher = algorithm.createCipher(key, nonce);
            const ciphertext = Buffer.concat([cipher.update(cleartext), cipher.final()]);
            const authTag = cipher.getAuthTag();

            let decipher: ReturnType<typeof algorithm.createDecipher>;
            expect(() => {
                decipher = algorithm.createDecipher(key, nonce);
            }).not.toThrow();
            expect(() => decipher.setAuthTag(authTag)).not.toThrow();
            expect(() => decipher.update(ciphertext)).not.toThrow();
            expect(() => decipher.final()).not.toThrow();
        });

        it('match cleartext and ciphertext', async () => {
            const cipher = algorithm.createCipher(key, nonce);
            const ciphertext = Buffer.concat([cipher.update(cleartext), cipher.final()]);
            const authTag = cipher.getAuthTag();

            let decipher: ReturnType<typeof algorithm.createDecipher>;
            expect(() => {
                decipher = algorithm.createDecipher(key, nonce);
            }).not.toThrow();

            expect(() => decipher.setAuthTag(authTag)).not.toThrow();

            const cleartextPartList: Buffer[] = [];

            expect(() => cleartextPartList.push(decipher.update(ciphertext))).not.toThrow();

            expect(() => cleartextPartList.push(decipher.final())).not.toThrow();

            const cleartext2 = Buffer.concat(cleartextPartList);
            expect(cleartext2).toStrictEqual(cleartext);
            expect(cleartext).toStrictEqual(cleartext2);
        });

        describe('decryption fail', () => {
            it('different key', async () => {
                const cipher = algorithm.createCipher(key, nonce);
                const ciphertext = Buffer.concat([cipher.update(cleartext), cipher.final()]);
                const authTag = cipher.getAuthTag();

                const key2 = randomBytes(algorithm.keyLength);

                let decipher: ReturnType<typeof algorithm.createDecipher>;
                expect(() => {
                    decipher = algorithm.createDecipher(key2, nonce);
                }).not.toThrow();

                expect(() => decipher.setAuthTag(authTag)).not.toThrow();

                expect(() => decipher.update(ciphertext)).not.toThrow();

                expect(() => decipher.final()).toThrow(/^Unsupported state or unable to authenticate data$/);
            });
            it('different nonce', async () => {
                const cipher = algorithm.createCipher(key, nonce);
                const ciphertext = Buffer.concat([cipher.update(cleartext), cipher.final()]);
                const authTag = cipher.getAuthTag();

                const nonce2 = randomBytes(algorithm.nonceLength);

                let decipher: ReturnType<typeof algorithm.createDecipher>;
                expect(() => {
                    decipher = algorithm.createDecipher(key, nonce2);
                }).not.toThrow();

                expect(() => decipher.setAuthTag(authTag)).not.toThrow();

                expect(() => decipher.update(ciphertext)).not.toThrow();

                expect(() => decipher.final()).toThrow(/^Unsupported state or unable to authenticate data$/);
            });
        });
    },
);
