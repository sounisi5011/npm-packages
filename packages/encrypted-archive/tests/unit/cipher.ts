import { randomBytes } from 'crypto';

import { getCryptoAlgorithm } from '../../src/core/cipher';
import { cryptoAlgorithmNameList } from '../../src/core/types/crypto';
import { asyncIter2AsyncIterable } from '../../src/core/utils/convert';
import { cryptoAlgorithmBuiltinRecord as cryptoAlgorithmRecord } from '../../src/runtimes/node/cipher';
import { inspect } from '../../src/runtimes/node/utils';
import { iterable2buffer } from '../helpers';

function toIter<T>(iterable: Iterable<T>): AsyncIterableIterator<T> {
    const iterator = iterable[Symbol.iterator]();
    const asyncIter = {
        next: async () => iterator.next(),
        [Symbol.asyncIterator]: () => asyncIter,
    };
    return asyncIter;
}

const builtin = { cryptoAlgorithmRecord, inspect };

describe.each(cryptoAlgorithmNameList)(
    'getCryptoAlgorithm(%j)',
    cryptoAlgorithmName => {
        const algorithm = getCryptoAlgorithm(builtin, cryptoAlgorithmName);

        const key = randomBytes(algorithm.keyLength);
        const nonce = randomBytes(algorithm.nonceLength);
        const cleartext = randomBytes(42);

        it('encrypt()', async () => {
            await expect(algorithm.encrypt({ key, nonce, cleartext })).resolves.not.toThrow();
        });

        it('decrypt()', async () => {
            const { ciphertext, authTag } = await algorithm.encrypt({ key, nonce, cleartext });

            await expect((async () => {
                const result = algorithm.decrypt({
                    key,
                    nonce,
                    authTag,
                    ciphertextIter: toIter([ciphertext]),
                });
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                for await (const _ of asyncIter2AsyncIterable(result));
            })()).resolves.not.toThrow();
        });

        it('match cleartext and ciphertext', async () => {
            const { ciphertext, authTag } = await algorithm.encrypt({ key, nonce, cleartext });

            const cleartext2 = await iterable2buffer(asyncIter2AsyncIterable(
                algorithm.decrypt({
                    key,
                    nonce,
                    authTag,
                    ciphertextIter: toIter([ciphertext]),
                }),
            ));

            expect(cleartext2).toBytesEqual(cleartext);
            expect(cleartext).toBytesEqual(cleartext2);
        });

        describe('decryption fail', () => {
            it('different key', async () => {
                const { ciphertext, authTag } = await algorithm.encrypt({ key, nonce, cleartext });
                const key2 = randomBytes(algorithm.keyLength);

                await expect((async () => {
                    const result = algorithm.decrypt({
                        key: key2,
                        nonce,
                        authTag,
                        ciphertextIter: toIter([ciphertext]),
                    });
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    for await (const _ of asyncIter2AsyncIterable(result));
                })()).rejects.toThrow(/^Unsupported state or unable to authenticate data$/);
            });
            it('different nonce', async () => {
                const { ciphertext, authTag } = await algorithm.encrypt({ key, nonce, cleartext });
                const nonce2 = randomBytes(algorithm.nonceLength);

                await expect((async () => {
                    const result = algorithm.decrypt({
                        key,
                        nonce: nonce2,
                        authTag,
                        ciphertextIter: toIter([ciphertext]),
                    });
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    for await (const _ of asyncIter2AsyncIterable(result));
                })()).rejects.toThrow(/^Unsupported state or unable to authenticate data$/);
            });
        });
    },
);
