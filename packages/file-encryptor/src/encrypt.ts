import { randomBytes } from 'crypto';

import { CryptoAlgorithm, cryptoAlgorithmMap, CryptoAlgorithmName, defaultCryptoAlgorithmName } from './cipher';
import { compress, CompressOptionsWithString } from './compress';
import { createHeader, createSimpleHeader } from './header';
import { getKDF, KeyDerivationOptions, NormalizedKeyDerivationOptions } from './key-derivation-function';
import { nonceState } from './nonce';
import { validateChunk } from './stream';
import type { InputDataType } from './types';
import { anyArrayBuffer2Buffer } from './utils';
import type { AsyncIterableIteratorReturn } from './utils/type';

export interface EncryptOptions {
    algorithm?: CryptoAlgorithmName;
    keyDerivation?: KeyDerivationOptions;
    compress?: CompressOptionsWithString;
}

async function encryptChunk(
    chunk: unknown,
    algorithm: CryptoAlgorithm,
    key: Uint8Array,
    salt: Uint8Array,
    keyDerivationOptions: NormalizedKeyDerivationOptions,
    compressOptions: CompressOptionsWithString | undefined,
    isFirst: boolean,
): Promise<Buffer> {
    validateChunk(chunk);
    const cleartext = chunk;

    /**
     * Compress cleartext
     */
    const { algorithm: compressAlgorithmName, data: compressedCleartext } = compressOptions
        ? await compress(cleartext, compressOptions)
        : { algorithm: undefined, data: anyArrayBuffer2Buffer(cleartext) };

    /**
     * Generate nonce (also known as an IV / Initialization Vector)
     */
    const nonce = nonceState.create(algorithm.nonceLength);

    /**
     * Encrypt cleartext
     */
    const cipher = algorithm.createCipher(key, nonce);
    const ciphertextPart1 = cipher.update(compressedCleartext);
    const ciphertextPart2 = cipher.final();

    /**
     * Get authentication tag
     */
    const authTag = cipher.getAuthTag();

    /**
     * Generate header data
     * The data contained in the header will be used for decryption.
     */
    const ciphertextLength = ciphertextPart1.byteLength + ciphertextPart2.byteLength;
    const headerData = isFirst
        ? createHeader({
            algorithmName: algorithm.name,
            salt,
            keyLength: key.byteLength,
            keyDerivationOptions,
            nonce,
            authTag,
            compressAlgorithmName,
            ciphertextLength,
        })
        : createSimpleHeader({
            nonce,
            authTag,
            ciphertextLength,
        });

    /**
     * Merge header and ciphertext
     */
    const encryptedData = Buffer.concat([
        headerData,
        ciphertextPart1,
        ciphertextPart2,
    ]);
    return encryptedData;
}

export function createEncryptorIterator(
    password: InputDataType,
    options: EncryptOptions,
): (source: Iterable<InputDataType> | AsyncIterable<InputDataType>) => AsyncIterableIteratorReturn<Buffer, void> {
    const algorithm = cryptoAlgorithmMap.get(options.algorithm ?? defaultCryptoAlgorithmName);
    if (!algorithm) throw new TypeError(`Unknown algorithm was received: ${String(options.algorithm)}`);

    return async function* encryptor(source) {
        /**
         * Generate key
         */
        const {
            deriveKey,
            saltLength,
            normalizedOptions: normalizedKeyDerivationOptions,
        } = getKDF(options.keyDerivation);
        const salt = randomBytes(saltLength);
        const keyLength = algorithm.keyLength;
        const key = await deriveKey(password, salt, keyLength);

        let isFirst = true;
        for await (const chunk of source) {
            yield encryptChunk(
                chunk,
                algorithm,
                key,
                salt,
                normalizedKeyDerivationOptions,
                options.compress,
                isFirst,
            );
            isFirst = false;
        }
    };
}
