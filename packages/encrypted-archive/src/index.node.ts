import { randomBytes } from 'crypto';
import type * as stream from 'stream';

import { transformFrom } from '@sounisi5011/stream-transform-from';

import { createGetKDF } from './browser/key-derivation-function';
import { createDecryptorIterator, DecryptBuiltinAPIRecord } from './core/decrypt';
import { createEncryptorIterator, EncryptBuiltinAPIRecord, EncryptOptions } from './core/encrypt';
import { validateChunk } from './core/stream';
import type { InputDataType, IteratorConverter } from './core/types';
import type { CompressOptions } from './core/types/compress';
import type { CryptoAlgorithmName } from './core/types/crypto';
import type { KeyDerivationOptions } from './core/types/key-derivation-function';
import {
    asyncIterable2Uint8Array,
    convertIterableValue,
    fixNodePrimordialsErrorInstance,
    uint8arrayConcat,
} from './core/utils';
import { cryptoAlgorithmMap } from './node/cipher';
import { createCompressor, decompressIterable } from './node/compress';
import { arrayBufferView2NodeBuffer, bufferFrom, inspect } from './node/utils';

const builtin: EncryptBuiltinAPIRecord & DecryptBuiltinAPIRecord = {
    inspect,
    encodeString: str => Buffer.from(str, 'utf8'),
    getRandomBytes: async size => randomBytes(size),
    getKDF: createGetKDF({ inspect }),
    getCryptoAlgorithm(algorithmName) {
        const algorithm = cryptoAlgorithmMap.get(algorithmName);
        if (!algorithm) return undefined;

        return {
            algorithmName,
            keyLength: algorithm.keyLength,
            nonceLength: algorithm.nonceLength,
            async encrypt({ key, nonce, cleartext }) {
                /**
                 * Encrypt cleartext
                 */
                const cipher = algorithm.createCipher(key, nonce);
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
                    const decipher = algorithm.createDecipher(key, nonce);
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
    },
    createCompressor,
    decompressIterable,
};

export { CompressOptions, CryptoAlgorithmName, EncryptOptions, InputDataType, IteratorConverter, KeyDerivationOptions };

export async function encrypt(
    cleartext: InputDataType,
    password: InputDataType,
    options: EncryptOptions = {},
): Promise<Uint8Array> {
    const encryptor = createEncryptorIterator(builtin, password, options);
    const encryptedDataIterable = encryptor([cleartext]);
    return await asyncIterable2Uint8Array(encryptedDataIterable);
}

export async function decrypt(encryptedData: InputDataType, password: InputDataType): Promise<Uint8Array> {
    const decryptor = createDecryptorIterator(builtin, password);
    const decryptedDataIterable = decryptor([encryptedData]);
    return await asyncIterable2Uint8Array(decryptedDataIterable);
}

const createTransformStream = (
    transformFn: (source: AsyncIterable<ArrayBufferView>) => AsyncIterable<Uint8Array>,
): stream.Transform =>
    transformFrom(
        (source): AsyncIterable<Buffer> => {
            const inputIterable = convertIterableValue(
                source,
                ({ chunk, encoding }) => bufferFrom(validateChunk({ inspect }, chunk), encoding),
            );
            const transformedIterable = transformFn(inputIterable);
            return convertIterableValue(transformedIterable, arrayBufferView2NodeBuffer);
        },
        { readableObjectMode: true, writableObjectMode: true },
    );

export function encryptStream(password: InputDataType, options: EncryptOptions = {}): stream.Transform {
    const encryptor = createEncryptorIterator(builtin, password, options);
    return createTransformStream(encryptor);
}

export function decryptStream(password: InputDataType): stream.Transform {
    const decryptor = createDecryptorIterator(builtin, password);
    return createTransformStream(decryptor);
}

export function encryptIterator(password: InputDataType, options: EncryptOptions = {}): IteratorConverter {
    return createEncryptorIterator(builtin, password, options);
}

export function decryptIterator(password: InputDataType): IteratorConverter {
    return createDecryptorIterator(builtin, password);
}
