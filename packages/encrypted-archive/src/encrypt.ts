import { randomBytes } from 'crypto';

import { CryptoAlgorithm, cryptoAlgorithmMap, CryptoAlgorithmName, defaultCryptoAlgorithmName } from './cipher';
import { CompressOptions, createCompressor } from './compress';
import { createHeader, createSimpleHeader } from './header';
import { getKDF, KeyDerivationOptions, NormalizedKeyDerivationOptions } from './key-derivation-function';
import { nonceState } from './nonce';
import { validateChunk } from './stream';
import { bufferFrom, convertIterableValue } from './utils';

import type { InputDataType, IteratorConverter } from './types';
import type { AsyncIterableReturn } from './utils/type';

export interface EncryptOptions {
    algorithm?: CryptoAlgorithmName;
    keyDerivation?: KeyDerivationOptions;
    compress?: CompressOptions | CompressOptions['algorithm'];
}

interface EncryptorState {
    nonce: Uint8Array | Buffer;
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
    { algorithmName, keyResult, nonce, authTag, compressAlgorithmName, ciphertextLength, prevState }: {
        algorithmName: CryptoAlgorithmName;
        keyResult: KeyResult;
        nonce: Uint8Array;
        authTag: Uint8Array;
        compressAlgorithmName: CompressOptions['algorithm'] | undefined;
        ciphertextLength: number;
        prevState: EncryptorState | undefined;
    },
): Uint8Array {
    if (!prevState) {
        return createHeader({
            crypto: {
                algorithmName,
                nonce,
                authTag,
            },
            key: {
                length: keyResult.key.byteLength,
                salt: keyResult.salt,
                keyDerivationFunctionOptions: keyResult.normalizedKeyDerivationOptions,
            },
            compressAlgorithmName,
            ciphertextLength,
        });
    }

    const nonceDiff = nonceState.getDiff(prevState.nonce, nonce);
    return createSimpleHeader({
        crypto: {
            nonceDiff: 'fixedField' in nonceDiff
                ? { addFixed: nonceDiff.fixedField, resetCounter: nonceDiff.resetInvocationCount }
                : { addCounter: nonceDiff.invocationCount },
            authTag,
        },
        ciphertextLength,
    });
}

async function* encryptChunk(compressedCleartext: Buffer, {
    algorithm,
    keyResult,
    compressAlgorithmName,
    prevState,
}: {
    algorithm: CryptoAlgorithm;
    keyResult: KeyResult;
    compressAlgorithmName: CompressOptions['algorithm'] | undefined;
    prevState: EncryptorState | undefined;
}): AsyncIterableReturn<Buffer, EncryptorState> {
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
        prevState,
    });

    /**
     * Merge header and ciphertext
     */
    const encryptedData = Buffer.concat([
        headerData,
        ciphertextPart1,
        ciphertextPart2,
    ]);
    yield encryptedData;

    const newState: EncryptorState = {
        nonce,
    };
    return newState;
}

export function createEncryptorIterator(password: InputDataType, options: EncryptOptions): IteratorConverter {
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

        let prevState: EncryptorState | undefined;
        for await (const compressedCleartext of compressedSourceIterable) {
            prevState = yield* encryptChunk(compressedCleartext, {
                algorithm,
                keyResult,
                compressAlgorithmName,
                prevState,
            });
        }
    };
}
