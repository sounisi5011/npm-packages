import { randomBytes } from 'crypto';
import type * as stream from 'stream';

import { transformFrom } from '@sounisi5011/stream-transform-from';

import { getKDF } from './browser/key-derivation-function';
import { createDecryptorIterator, DecryptBuiltinAPIRecord } from './core/decrypt';
import { createEncryptorIterator, EncryptBuiltinAPIRecord, EncryptOptions } from './core/encrypt';
import { validateChunk } from './core/stream';
import type { InputDataType, IteratorConverter } from './core/types';
import type { CompressOptions } from './core/types/compress';
import type { CryptoAlgorithmName } from './core/types/crypto';
import type { KeyDerivationOptions } from './core/types/key-derivation-function';
import { asyncIterable2Buffer, bufferFrom, convertIterableValue, fixNodePrimordialsErrorInstance } from './core/utils';
import { cryptoAlgorithmMap } from './node/cipher';
import { createCompressor, decompressIterable } from './node/compress';

const builtin: EncryptBuiltinAPIRecord & DecryptBuiltinAPIRecord = {
    getRandomBytes: async size => randomBytes(size),
    getKDF,
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
                const ciphertextPart1 = cipher.update(cleartext);
                const ciphertextPart2 = cipher.final();

                /**
                 * Get authentication tag
                 */
                const authTag = cipher.getAuthTag();

                /**
                 * Merge ciphertext
                 * @see https://stackoverflow.com/a/69998555/4907315
                 */
                const ciphertext = new Uint8Array(ciphertextPart1.byteLength + ciphertextPart2.byteLength);
                ciphertext.set(ciphertextPart1);
                ciphertext.set(ciphertextPart2, ciphertextPart1.byteLength);

                return { authTag, ciphertext };
            },
            async *decrypt({ key, nonce, authTag, ciphertext }) {
                try {
                    const decipher = algorithm.createDecipher(key, nonce);
                    decipher.setAuthTag(authTag);
                    for await (const ciphertextChunk of ciphertext) {
                        yield decipher.update(ciphertextChunk);
                    }
                    yield decipher.final();
                } catch (error) {
                    fixNodePrimordialsErrorInstance(error);
                }
            },
        };
    },
    createCompressor,
    decompressIterable: (algorithmName, source) => decompressIterable(source, algorithmName),
};

export { CompressOptions, CryptoAlgorithmName, EncryptOptions, InputDataType, IteratorConverter, KeyDerivationOptions };

export async function encrypt(
    cleartext: InputDataType,
    password: InputDataType,
    options: EncryptOptions = {},
): Promise<Buffer> {
    const encryptor = createEncryptorIterator(builtin, password, options);
    const encryptedDataIterable = encryptor([cleartext]);
    return await asyncIterable2Buffer(encryptedDataIterable);
}

export async function decrypt(encryptedData: InputDataType, password: InputDataType): Promise<Buffer> {
    const decryptor = createDecryptorIterator(builtin, password);
    const decryptedDataIterable = decryptor([encryptedData]);
    return await asyncIterable2Buffer(decryptedDataIterable);
}

function transformSource2buffer<T, U extends BufferEncoding>(
    source: AsyncIterable<{ chunk: T; encoding: U }>,
): AsyncIterable<Buffer> {
    return convertIterableValue(
        source,
        ({ chunk, encoding }) => bufferFrom(validateChunk(chunk), encoding),
    );
}

export function encryptStream(password: InputDataType, options: EncryptOptions = {}): stream.Transform {
    const encryptor = createEncryptorIterator(builtin, password, options);
    return transformFrom(
        source => encryptor(transformSource2buffer(source)),
        { readableObjectMode: true, writableObjectMode: true },
    );
}

export function decryptStream(password: InputDataType): stream.Transform {
    const decryptor = createDecryptorIterator(builtin, password);
    return transformFrom(
        source => decryptor(transformSource2buffer(source)),
        { readableObjectMode: true, writableObjectMode: true },
    );
}

export function encryptIterator(password: InputDataType, options: EncryptOptions = {}): IteratorConverter {
    return createEncryptorIterator(builtin, password, options);
}

export function decryptIterator(password: InputDataType): IteratorConverter {
    return createDecryptorIterator(builtin, password);
}
