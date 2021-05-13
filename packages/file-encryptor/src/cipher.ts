import { createCipheriv, createDecipheriv } from 'crypto';
import type * as crypto from 'crypto';

const cryptoAlgorithmList = [
    (() => {
        const ALGORITHM_NAME = 'aes-256-gcm';

        return {
            name: ALGORITHM_NAME,
            keyLength: 256 / 8,
            /**
             * @see https://scrapbox.io/nwtgck/AES-GCM%E3%81%AE%E5%88%9D%E6%9C%9F%E5%8C%96%E3%83%99%E3%82%AF%E3%83%88%E3%83%ABNONCE%E3%81%AF12%E3%83%90%E3%82%A4%E3%83%88(96%E3%83%93%E3%83%83%E3%83%88)%E3%81%8C%E6%8E%A8%E5%A5%A8
             * @see https://crypto.stackexchange.com/a/26787
             */
            nonceLength: 96 / 8,
            createCipher: (key: crypto.CipherKey, nonce: crypto.BinaryLike) =>
                createCipheriv(ALGORITHM_NAME, key, nonce),
            createDecipher: (key: crypto.CipherKey, nonce: crypto.BinaryLike) =>
                createDecipheriv(ALGORITHM_NAME, key, nonce),
        } as const;
    })(),
    (() => {
        const ALGORITHM_NAME = 'chacha20-poly1305';
        /**
         * @see https://tools.ietf.org/html/rfc8103#section-1.1
         * @see https://tools.ietf.org/html/rfc7539#section-2.8
         */
        const AUTH_TAG_LEN = 128 / 8;

        return {
            name: ALGORITHM_NAME,
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
            createCipher: (key: crypto.CipherKey, nonce: crypto.BinaryLike) =>
                createCipheriv(ALGORITHM_NAME, key, nonce, { authTagLength: AUTH_TAG_LEN }),
            createDecipher: (key: crypto.CipherKey, nonce: crypto.BinaryLike) =>
                createDecipheriv(ALGORITHM_NAME, key, nonce, { authTagLength: AUTH_TAG_LEN }),
        } as const;
    })(),
];

export type CryptoAlgorithm = (typeof cryptoAlgorithmList)[number];
export type CryptoAlgorithmName = CryptoAlgorithm['name'];

export const cryptoAlgorithmMap = new Map(cryptoAlgorithmList.map(data => [data.name, data]));
export const defaultCryptoAlgorithmName: CryptoAlgorithmName = 'chacha20-poly1305';
