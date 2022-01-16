import { createCipheriv, createDecipheriv } from 'crypto';
import type * as crypto from 'crypto';

import type { CryptoAlgorithmData, CryptoAlgorithmName, GetCryptoAlgorithm } from '../core/types/crypto';
import { uint8arrayConcat } from '../core/utils';
import { fixNodePrimordialsErrorInstance } from './utils';

const cryptoAlgorithmList: readonly CryptoAlgorithmData[] = [
    (() => {
        const ALGORITHM_NAME = 'aes-256-gcm';

        return {
            algorithmName: ALGORITHM_NAME,
            keyLength: 256 / 8,
            /**
             * @see https://scrapbox.io/nwtgck/AES-GCM%E3%81%AE%E5%88%9D%E6%9C%9F%E5%8C%96%E3%83%99%E3%82%AF%E3%83%88%E3%83%ABNONCE%E3%81%AF12%E3%83%90%E3%82%A4%E3%83%88(96%E3%83%93%E3%83%83%E3%83%88)%E3%81%8C%E6%8E%A8%E5%A5%A8
             * @see https://crypto.stackexchange.com/a/26787
             */
            nonceLength: 96 / 8,
            async encrypt({ key, nonce, cleartext }) {
                /**
                 * Encrypt cleartext
                 */
                const cipher = createCipheriv(ALGORITHM_NAME, key, nonce);
                const ciphertext = uint8arrayConcat(
                    cipher.update(cleartext),
                    cipher.final(),
                );

                /**
                 * Get authentication tag
                 */
                const authTag = cipher.getAuthTag();

                return { authTag, ciphertext };
            },
            async decrypt({ key, nonce, authTag, ciphertext }) {
                try {
                    const decipher = createDecipheriv(ALGORITHM_NAME, key, nonce);
                    decipher.setAuthTag(authTag);
                    const cleartext = uint8arrayConcat(
                        decipher.update(ciphertext),
                        decipher.final(),
                    );
                    return { cleartext };
                } catch (error) {
                    fixNodePrimordialsErrorInstance(error);
                }
            },
        };
    })(),
    (() => {
        const ALGORITHM_NAME = 'chacha20-poly1305';
        /**
         * @see https://tools.ietf.org/html/rfc8103#section-1.1
         * @see https://tools.ietf.org/html/rfc7539#section-2.8
         */
        const AUTH_TAG_LEN = 128 / 8;

        // @ts-expect-error TS2322: Type '"chacha20-poly1305"' is not assignable to type 'CipherCCMTypes'.
        // Note: `@types/node@12.20.37` does not support chacha20-poly1305.
        //       However, Node.js 12 can use chacha20-poly1305.
        const algorithm: crypto.CipherCCMTypes = ALGORITHM_NAME;

        return {
            algorithmName: ALGORITHM_NAME,
            /**
             * @see https://tools.ietf.org/html/rfc8103#section-1.1
             * @see https://tools.ietf.org/html/rfc7539#section-2.8
             */
            keyLength: 256 / 8,
            /**
             * @see https://tools.ietf.org/html/rfc8103#section-1.1
             * @see https://tools.ietf.org/html/rfc7539#section-2.8
             */
            nonceLength: 96 / 8,
            async encrypt({ key, nonce, cleartext }) {
                /**
                 * Encrypt cleartext
                 */
                const cipher = createCipheriv(algorithm, key, nonce, { authTagLength: AUTH_TAG_LEN });
                const ciphertext = uint8arrayConcat(
                    cipher.update(cleartext),
                    cipher.final(),
                );

                /**
                 * Get authentication tag
                 */
                const authTag = cipher.getAuthTag();

                return { authTag, ciphertext };
            },
            async decrypt({ key, nonce, authTag, ciphertext }) {
                try {
                    const decipher = createDecipheriv(algorithm, key, nonce, { authTagLength: AUTH_TAG_LEN });
                    decipher.setAuthTag(authTag);
                    const cleartext = uint8arrayConcat(
                        decipher.update(ciphertext),
                        decipher.final(),
                    );
                    return { cleartext };
                } catch (error) {
                    fixNodePrimordialsErrorInstance(error);
                }
            },
        };
    })(),
];

const cryptoAlgorithmMap = new Map(cryptoAlgorithmList.map(data => [data.algorithmName, data]));
export const defaultCryptoAlgorithmName: CryptoAlgorithmName = 'chacha20-poly1305';

export const getCryptoAlgorithm: GetCryptoAlgorithm = algorithmName => cryptoAlgorithmMap.get(algorithmName);
