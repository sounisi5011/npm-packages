import { createCipheriv, createDecipheriv } from 'crypto';

import type { CryptoAlgorithmData } from '../../../core/types/crypto';
import { fixNodePrimordialsErrorInstance } from '../utils';

const ALGORITHM_NAME = 'aes-256-gcm' as const;

export const keyLength = 256 / 8;

/**
 * @see https://scrapbox.io/nwtgck/AES-GCM%E3%81%AE%E5%88%9D%E6%9C%9F%E5%8C%96%E3%83%99%E3%82%AF%E3%83%88%E3%83%ABNONCE%E3%81%AF12%E3%83%90%E3%82%A4%E3%83%88(96%E3%83%93%E3%83%83%E3%83%88)%E3%81%8C%E6%8E%A8%E5%A5%A8
 * @see https://crypto.stackexchange.com/a/26787
 */
export const nonceLength = 96 / 8;

export const encrypt: CryptoAlgorithmData['encrypt'] = async ({ key, nonce, cleartext }) => {
    const cipher = createCipheriv(ALGORITHM_NAME, key, nonce);
    const ciphertextPart1 = cipher.update(cleartext);
    const ciphertextPart2 = cipher.final();

    return {
        authTag: cipher.getAuthTag(),
        ciphertext: Buffer.concat([ciphertextPart1, ciphertextPart2]),
    };
};

export const decrypt: CryptoAlgorithmData['decrypt'] = async function*({ key, nonce, authTag, ciphertextIter }) {
    try {
        const decipher = createDecipheriv(ALGORITHM_NAME, key, nonce);
        decipher.setAuthTag(authTag);
        for await (const ciphertextChunk of ciphertextIter) {
            yield decipher.update(ciphertextChunk);
        }
        yield decipher.final();
    } catch (error) {
        fixNodePrimordialsErrorInstance(error);
    }
};
