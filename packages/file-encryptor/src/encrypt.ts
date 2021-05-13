import { randomBytes } from 'crypto';

import { CryptoAlgorithm, cryptoAlgorithmMap, CryptoAlgorithmName, defaultCryptoAlgorithmName } from './cipher';
import { CompressAlgorithmName, CompressOptionsWithString, createCompressor } from './compress';
import {
    createHeader,
    createSimpleHeader,
    HeaderDataWithCiphertextLength,
    SimpleHeaderDataWithCiphertextLength,
} from './header';
import { getKDF, KeyDerivationOptions, NormalizedKeyDerivationOptions } from './key-derivation-function';
import { nonceState } from './nonce';
import { validateChunk } from './stream';
import type { InputDataType } from './types';
import { bufferFrom, convertIterableValue } from './utils';
import type { AsyncIterableIteratorReturn } from './utils/type';

export interface EncryptOptions {
    algorithm?: CryptoAlgorithmName;
    keyDerivation?: KeyDerivationOptions;
    compress?: CompressOptionsWithString;
}

async function generateKey(
    { password, keyLength, keyDerivationOptions }: {
        password: InputDataType;
        keyLength: number;
        keyDerivationOptions: KeyDerivationOptions | undefined;
    },
): Promise<{ key: Uint8Array; salt: Uint8Array; normalizedKeyDerivationOptions: NormalizedKeyDerivationOptions }> {
    const {
        deriveKey,
        saltLength,
        normalizedOptions: normalizedKeyDerivationOptions,
    } = getKDF(keyDerivationOptions);
    const salt = randomBytes(saltLength);
    const key = await deriveKey(password, salt, keyLength);

    return {
        key,
        salt,
        normalizedKeyDerivationOptions,
    };
}

function createHeaderData(
    data: HeaderDataWithCiphertextLength & SimpleHeaderDataWithCiphertextLength,
    isFirst: boolean,
): Uint8Array {
    return isFirst ? createHeader(data) : createSimpleHeader(data);
}

async function encryptChunk({
    compressedCleartext,
    algorithm,
    key,
    salt,
    keyDerivationOptions,
    compressAlgorithmName,
    isFirst,
}: {
    compressedCleartext: Buffer;
    algorithm: CryptoAlgorithm;
    key: Uint8Array;
    salt: Uint8Array;
    keyDerivationOptions: NormalizedKeyDerivationOptions;
    compressAlgorithmName: CompressAlgorithmName | undefined;
    isFirst: boolean;
}): Promise<Buffer> {
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
    const headerData = createHeaderData({
        algorithmName: algorithm.name,
        salt,
        keyLength: key.byteLength,
        keyDerivationOptions,
        nonce,
        authTag,
        compressAlgorithmName,
        ciphertextLength: ciphertextPart1.byteLength + ciphertextPart2.byteLength,
    }, isFirst);

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

    const { compressAlgorithmName, compressIterable } = createCompressor(options.compress);

    return async function* encryptor(source) {
        /**
         * Generate key
         */
        const { key, salt, normalizedKeyDerivationOptions } = await generateKey({
            password,
            keyLength: algorithm.keyLength,
            keyDerivationOptions: options.keyDerivation,
        });

        const bufferSourceIterable = convertIterableValue(
            source,
            chunk => bufferFrom(validateChunk(chunk), 'utf8'),
        );

        /**
         * Compress cleartext
         */
        const compressedSourceIterable = compressIterable(bufferSourceIterable);

        let isFirst = true;
        for await (const compressedCleartext of compressedSourceIterable) {
            yield await encryptChunk({
                compressedCleartext,
                algorithm,
                key,
                salt,
                keyDerivationOptions: normalizedKeyDerivationOptions,
                compressAlgorithmName,
                isFirst,
            });
            isFirst = false;
        }
    };
}
