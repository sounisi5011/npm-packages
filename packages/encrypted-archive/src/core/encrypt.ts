import { CryptoAlgorithmDataWithAlgorithmName, getCryptoAlgorithm } from './cipher';
import { createCompressor } from './compress';
import { validatePassword } from './errors';
import { createHeader, createSimpleHeader } from './header';
import { getKDF } from './key-derivation-function';
import { nonceState } from './nonce';
import type { InputDataType, IteratorConverter } from './types';
import type { BuiltinEncodeStringRecord, BuiltinInspectRecord } from './types/builtin';
import type { BaseCompressOptions, CompressAlgorithmName, CompressionAlgorithmBuiltinAPI } from './types/compress';
import type { CryptoAlgorithmBuiltinAPI, CryptoAlgorithmName, GetRandomBytesFn } from './types/crypto';
import type {
    KDFBuiltinAPIRecord,
    KeyDerivationOptions,
    NormalizedKeyDerivationOptions,
} from './types/key-derivation-function';
import type { AsyncIterableReturn } from './types/utils';
import { uint8arrayConcat, uint8arrayFrom } from './utils/array-buffer';
import { convertChunk, convertIterableValue } from './utils/convert';

export interface EncryptOptions<TCompressOptions extends BaseCompressOptions> {
    algorithm?: CryptoAlgorithmName | undefined;
    keyDerivation?: KeyDerivationOptions | undefined;
    compress?: TCompressOptions | TCompressOptions['algorithm'] | undefined;
}

export interface EncryptBuiltinAPIRecord extends BuiltinEncodeStringRecord, BuiltinInspectRecord {
    getRandomBytes: GetRandomBytesFn;
    cryptoAlgorithm: CryptoAlgorithmBuiltinAPI;
    kdfBuiltin: KDFBuiltinAPIRecord;
    compressionAlgorithm: CompressionAlgorithmBuiltinAPI;
}

interface EncryptorState {
    nonce: Uint8Array;
}

interface KeyResult {
    key: Uint8Array;
    salt: Uint8Array;
    normalizedKeyDerivationOptions: NormalizedKeyDerivationOptions;
}

async function generateKey(
    builtin: { getRandomBytes: GetRandomBytesFn; kdfBuiltin: KDFBuiltinAPIRecord } & BuiltinInspectRecord,
    { password, keyLength, keyDerivationOptions }: {
        password: Uint8Array;
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
        compressAlgorithmName: CompressAlgorithmName | undefined;
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
    algorithm: CryptoAlgorithmDataWithAlgorithmName;
    keyResult: KeyResult;
    compressAlgorithmName: CompressAlgorithmName | undefined;
    prevState: EncryptorState | undefined;
}): AsyncIterableReturn<Uint8Array, EncryptorState> {
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
    const encryptedData = uint8arrayConcat(headerData, ciphertext);
    yield encryptedData;

    const newState: EncryptorState = {
        nonce,
    };
    return newState;
}

export function createEncryptorIterator<TCompressOptions extends BaseCompressOptions>(
    builtin: EncryptBuiltinAPIRecord,
    password: InputDataType,
    options: EncryptOptions<TCompressOptions>,
): IteratorConverter {
    validatePassword(builtin, password);
    const algorithm = getCryptoAlgorithm(builtin, options.algorithm);

    const { compressAlgorithmName, compressIterable } = createCompressor(builtin, options.compress);

    return async function* encryptor(source) {
        /**
         * Generate key
         */
        const keyResult = await generateKey(builtin, {
            password: uint8arrayFrom(builtin.encodeString, password),
            keyLength: algorithm.keyLength,
            keyDerivationOptions: options.keyDerivation,
        });

        const bufferSourceIterable = convertIterableValue(source, convertChunk(builtin));

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
