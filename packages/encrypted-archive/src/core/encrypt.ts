import { createHeader, createSimpleHeader } from './header';
import { getKDF } from './key-derivation-function';
import { nonceState } from './nonce';
import { validateChunk } from './stream';
import type { InputDataType, IteratorConverter } from './types';
import type { CompressOptions, CreateCompressor } from './types/compress';
import {
    CryptoAlgorithmData,
    CryptoAlgorithmName,
    defaultCryptoAlgorithmName,
    GetCryptoAlgorithm,
    GetRandomBytesFn,
} from './types/crypto';
import type { BuiltinInspectRecord } from './types/inspect';
import type {
    KDFBuiltinAPIRecord,
    KeyDerivationOptions,
    NormalizedKeyDerivationOptions,
} from './types/key-derivation-function';
import { bufferFrom, convertIterableValue } from './utils';
import type { AsyncIterableReturn } from './utils/type';

export interface EncryptOptions {
    algorithm?: CryptoAlgorithmName | undefined;
    keyDerivation?: KeyDerivationOptions | undefined;
    compress?: CompressOptions | CompressOptions['algorithm'] | undefined;
}

export interface EncryptBuiltinAPIRecord extends BuiltinInspectRecord {
    getRandomBytes: GetRandomBytesFn;
    getCryptoAlgorithm: GetCryptoAlgorithm;
    kdfBuiltin: KDFBuiltinAPIRecord;
    createCompressor: CreateCompressor;
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
    builtin: { getRandomBytes: GetRandomBytesFn; kdfBuiltin: KDFBuiltinAPIRecord } & BuiltinInspectRecord,
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
    } = getKDF(builtin, keyDerivationOptions);
    const salt = await builtin.getRandomBytes(saltLength);
    const key = await deriveKey(password, salt, keyLength);

    return {
        key,
        salt,
        normalizedKeyDerivationOptions,
    };
}

function createHeaderData(
    builtin: BuiltinInspectRecord,
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
        return createHeader(builtin, {
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
    return createSimpleHeader(builtin, {
        crypto: {
            nonceDiff: 'fixedField' in nonceDiff
                ? { addFixed: nonceDiff.fixedField, resetCounter: nonceDiff.resetInvocationCount }
                : { addCounter: nonceDiff.invocationCount },
            authTag,
        },
        ciphertextLength,
    });
}

async function* encryptChunk(builtin: BuiltinInspectRecord, compressedCleartext: Uint8Array, {
    algorithm,
    keyResult,
    compressAlgorithmName,
    prevState,
}: {
    algorithm: CryptoAlgorithmData;
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
    const { ciphertext, authTag } = await algorithm.encrypt({
        key: keyResult.key,
        nonce,
        cleartext: compressedCleartext,
    });

    /**
     * Generate header data
     * The data contained in the header will be used for decryption.
     */
    const headerData = createHeaderData(builtin, {
        algorithmName: algorithm.algorithmName,
        keyResult,
        nonce,
        authTag,
        compressAlgorithmName,
        ciphertextLength: ciphertext.byteLength,
        prevState,
    });

    /**
     * Merge header and ciphertext
     */
    const encryptedData = Buffer.concat([
        headerData,
        ciphertext,
    ]);
    yield encryptedData;

    const newState: EncryptorState = {
        nonce,
    };
    return newState;
}

export function createEncryptorIterator(
    builtin: EncryptBuiltinAPIRecord,
    password: InputDataType,
    options: EncryptOptions,
): IteratorConverter {
    const algorithm = builtin.getCryptoAlgorithm(options.algorithm ?? defaultCryptoAlgorithmName);
    if (!algorithm) throw new TypeError(`Unknown algorithm was received: ${String(options.algorithm)}`);

    const { compressAlgorithmName, compressIterable } = builtin.createCompressor(options.compress);

    return async function* encryptor(source) {
        /**
         * Generate key
         */
        const keyResult = await generateKey(builtin, {
            password,
            keyLength: algorithm.keyLength,
            keyDerivationOptions: options.keyDerivation,
        });

        const bufferSourceIterable = convertIterableValue(
            source,
            chunk => bufferFrom(validateChunk(builtin, chunk), 'utf8'),
        );

        /**
         * Compress cleartext
         */
        const compressedSourceIterable = compressIterable(bufferSourceIterable);

        let prevState: EncryptorState | undefined;
        for await (const compressedCleartext of compressedSourceIterable) {
            prevState = yield* encryptChunk(builtin, compressedCleartext, {
                algorithm,
                keyResult,
                compressAlgorithmName,
                prevState,
            });
        }
    };
}
