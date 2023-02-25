import { CipherCCMTypes, createCipheriv, createDecipheriv } from 'crypto';

import type { CryptoAlgorithmData } from '../../../core/types/crypto';
import { fixNodePrimordialsErrorInstance } from '../utils';

// @ts-expect-error TS2322: Type '"chacha20-poly1305"' is not assignable to type 'CipherCCMTypes'.
// Note: `@types/node@12.20.37` does not support chacha20-poly1305.
//       However, Node.js 12 can use chacha20-poly1305.
const ALGORITHM_NAME: CipherCCMTypes = 'chacha20-poly1305';

/**
 * @see https://tools.ietf.org/html/rfc8103#section-1.1
 * @see https://tools.ietf.org/html/rfc7539#section-2.8
 */
const AUTH_TAG_LEN = 128 / 8;

export const chacha20Poly1305: CryptoAlgorithmData = {
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

    async encrypt({ key, nonce, plaintext }) {
        const cipher = createCipheriv(ALGORITHM_NAME, key, nonce, { authTagLength: AUTH_TAG_LEN });
        const ciphertextPart1 = cipher.update(plaintext);
        const ciphertextPart2 = cipher.final();

        return {
            authTag: cipher.getAuthTag(),
            ciphertext: Buffer.concat([ciphertextPart1, ciphertextPart2]),
        };
    },

    async *decrypt({ key, nonce, authTag, ciphertextIter }) {
        try {
            const decipher = createDecipheriv(ALGORITHM_NAME, key, nonce, { authTagLength: AUTH_TAG_LEN });
            decipher.setAuthTag(authTag);
            for await (const ciphertextChunk of ciphertextIter) {
                yield decipher.update(ciphertextChunk);
            }
            yield decipher.final();
        } catch (error) {
            fixNodePrimordialsErrorInstance(error);
        }
    },
};
