import { randomBytes } from 'crypto';

import { CryptAlgorithm, cryptAlgorithmMap, CryptAlgorithmName, defaultCryptAlgorithmName } from './cipher';
import { compress, CompressOptionsWithString } from './compress';
import { createHeader, createSimpleHeader } from './header';
import { getKDF, KeyDerivationOptions } from './key-derivation-function';
import { nonceState } from './nonce';
import { validateChunk } from './stream';
import type { InputDataType } from './types';
import { anyArrayBuffer2Buffer } from './utils';
import { PromisifyTransform } from './utils/stream';

export interface EncryptOptions {
    algorithm?: CryptAlgorithmName;
    keyDerivation?: KeyDerivationOptions;
    compress?: CompressOptionsWithString;
}

export async function encryptFirstChunk(
    cleartext: InputDataType,
    password: InputDataType,
    options: EncryptOptions,
): Promise<{
    encryptedData: Buffer;
    algorithm: CryptAlgorithm;
    key: Uint8Array;
}> {
    const algorithm = cryptAlgorithmMap.get(options.algorithm ?? defaultCryptAlgorithmName);
    if (!algorithm) {
        throw new TypeError(`Unknown algorithm was received: ${String(options.algorithm)}`);
    }

    /**
     * Compress cleartext
     */
    const { algorithm: compressAlgorithmName, data: compressedCleartext } = options.compress
        ? await compress(cleartext, options.compress)
        : { algorithm: undefined, data: anyArrayBuffer2Buffer(cleartext) };

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
    const headerData = createHeader({
        algorithmName: algorithm.name,
        salt,
        keyLength,
        keyDerivationOptions: normalizedKeyDerivationOptions,
        nonce,
        authTag,
        compressAlgorithmName,
        ciphertextLength: ciphertextPart1.byteLength + ciphertextPart2.byteLength,
    });

    /**
     * Merge header and ciphertext
     */
    const encryptedData = Buffer.concat([
        headerData,
        ciphertextPart1,
        ciphertextPart2,
    ]);
    return {
        encryptedData,
        algorithm,
        key,
    };
}

interface EncryptSubsequentChunkOptions {
    algorithm: CryptAlgorithm;
    key: Uint8Array;
    compress: CompressOptionsWithString | undefined;
}

export async function encryptSubsequentChunk(
    cleartext: InputDataType,
    options: EncryptSubsequentChunkOptions,
): Promise<{ encryptedData: Buffer }> {
    /**
     * Compress cleartext
     */
    const compressedCleartext = options.compress
        ? (await compress(cleartext, options.compress)).data
        : anyArrayBuffer2Buffer(cleartext);

    /**
     * Generate nonce (also known as an IV / Initialization Vector)
     */
    const nonce = nonceState.create(options.algorithm.nonceLength);

    /**
     * Encrypt cleartext
     */
    const cipher = options.algorithm.createCipher(options.key, nonce);
    const ciphertextPart1 = cipher.update(compressedCleartext);
    const ciphertextPart2 = cipher.final();

    /**
     * Get authentication tag
     */
    const authTag = cipher.getAuthTag();

    /**
     * Generate simple header data
     * The data contained in the header will be used for decryption.
     */
    const simpleHeaderData = createSimpleHeader({
        nonce,
        authTag,
        ciphertextLength: ciphertextPart1.byteLength + ciphertextPart2.byteLength,
    });

    /**
     * Merge header and ciphertext
     */
    const encryptedData = Buffer.concat([
        simpleHeaderData,
        ciphertextPart1,
        ciphertextPart2,
    ]);
    return { encryptedData };
}

type EncryptorMetadata = Omit<EncryptSubsequentChunkOptions, 'compress'>;

async function encryptChunk(
    chunk: unknown,
    password: InputDataType,
    options: EncryptOptions,
    encryptorMetadata: EncryptorMetadata | undefined,
): Promise<{ encryptedData: Buffer; encryptorMetadata: EncryptorMetadata }> {
    validateChunk(chunk);
    if (!encryptorMetadata) {
        const { algorithm, key, encryptedData } = await encryptFirstChunk(chunk, password, options);
        return {
            encryptedData,
            encryptorMetadata: { algorithm, key },
        };
    } else {
        const { encryptedData } = await encryptSubsequentChunk(
            chunk,
            { algorithm: encryptorMetadata.algorithm, key: encryptorMetadata.key, compress: options.compress },
        );
        return { encryptedData, encryptorMetadata };
    }
}

export function createEncryptorGenerator(password: InputDataType, options: EncryptOptions) {
    return async function* encryptor(
        source: Iterable<InputDataType> | AsyncIterable<InputDataType>,
    ): AsyncGenerator<Buffer, void, unknown> {
        let encryptorMetadata: EncryptorMetadata | undefined;
        for await (const chunk of source) {
            const result = await encryptChunk(chunk, password, options, encryptorMetadata);
            encryptorMetadata = result.encryptorMetadata;
            yield result.encryptedData;
        }
    };
}

export class EncryptorTransform extends PromisifyTransform {
    private readonly password: InputDataType;
    private readonly options: EncryptOptions;
    private encryptorMetadata: EncryptorMetadata | undefined;

    constructor(password: InputDataType, options: EncryptOptions) {
        super({ writableObjectMode: true });
        this.password = password;
        this.options = options;
    }

    async transform(chunk: unknown): Promise<Buffer> {
        const result = await encryptChunk(chunk, this.password, this.options, this.encryptorMetadata);
        this.encryptorMetadata = result.encryptorMetadata;
        return result.encryptedData;
    }
}
