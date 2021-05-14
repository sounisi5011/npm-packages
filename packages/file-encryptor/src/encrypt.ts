import { randomBytes } from 'crypto';

import { CryptoAlgorithm, cryptoAlgorithmMap, CryptoAlgorithmName, defaultCryptoAlgorithmName } from './cipher';
import { CompressAlgorithmName, CompressOptionsWithString, createCompressor } from './compress';
import { createHeader, createSimpleHeader } from './header';
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

interface KeyResult {
    key: Uint8Array;
    salt: Uint8Array;
    normalizedKeyDerivationOptions: NormalizedKeyDerivationOptions;
}

async function generateKey(
    { password, keyLength, keyDerivationOptions }: {
        password: InputDataType;
        keyLength: number;
        keyDerivationOptions: KeyDerivationOptions | undefined;
    },
): Promise<KeyResult> {
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
    { algorithmName, keyResult, nonce, authTag, compressAlgorithmName, ciphertextLength }: {
        algorithmName: CryptoAlgorithmName;
        keyResult: KeyResult;
        nonce: Uint8Array;
        authTag: Uint8Array;
        compressAlgorithmName: CompressAlgorithmName | undefined;
        ciphertextLength: number;
    },
    isFirst: boolean,
): Array<Uint8Array | number[]> {
    return isFirst
        ? createHeader({
            algorithmName,
            salt: keyResult.salt,
            keyLength: keyResult.key.byteLength,
            keyDerivationOptions: keyResult.normalizedKeyDerivationOptions,
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
}

async function encryptChunk(compressedCleartext: Buffer, {
    algorithm,
    keyResult,
    compressAlgorithmName,
}: {
    algorithm: CryptoAlgorithm;
    keyResult: KeyResult;
    compressAlgorithmName: CompressAlgorithmName | undefined;
}, isFirst: boolean): Promise<Buffer> {
    /**
     * Generate nonce (also known as an IV / Initialization Vector)
     */
    const nonce = nonceState.create(algorithm.nonceLength);

    /**
     * Encrypt cleartext
     */
    const cipher = algorithm.createCipher(keyResult.key, nonce);
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
        keyResult,
        nonce,
        authTag,
        compressAlgorithmName,
        ciphertextLength: ciphertextPart1.byteLength + ciphertextPart2.byteLength,
    }, isFirst);

    /**
     * Merge header and ciphertext
     */
    const encryptedData = Buffer.concat([
        ...headerData
            .map(data => data instanceof Uint8Array ? data : Buffer.from(data)),
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
        const keyResult = await generateKey({
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
            yield await encryptChunk(compressedCleartext, {
                algorithm,
                keyResult,
                compressAlgorithmName,
            }, isFirst);
            isFirst = false;
        }
    };
}
