import { randomBytes } from 'crypto';
import type * as stream from 'stream';

import { transformFrom } from '@sounisi5011/stream-transform-from';

import type { CompressOptions } from './compress';
import { createDecryptorIterator, DecryptBuiltinAPIRecord } from './decrypt';
import { createEncryptorIterator, EncryptBuiltinAPIRecord, EncryptOptions } from './encrypt';
import type { KeyDerivationOptions } from './key-derivation-function';
import { cryptoAlgorithmMap } from './node/cipher';
import { validateChunk } from './stream';
import type { InputDataType, IteratorConverter } from './types';
import type { CryptoAlgorithmName } from './types/crypto';
import { asyncIterable2Buffer, bufferFrom, convertIterableValue, fixNodePrimordialsErrorInstance } from './utils';

const builtin: EncryptBuiltinAPIRecord & DecryptBuiltinAPIRecord = {
    getRandomBytes: async size => randomBytes(size),
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
