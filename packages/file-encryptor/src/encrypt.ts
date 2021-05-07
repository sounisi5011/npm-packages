import { randomBytes } from 'crypto';

import { CryptAlgorithm, cryptAlgorithmMap, CryptAlgorithmName, defaultCryptAlgorithmName } from './cipher';
import { compress, CompressOptionsWithString } from './compress';
import { createHeader, createSimpleHeader } from './header';
import { getKDF, KeyDerivationOptions } from './key-derivation-function';
import { nonceState } from './nonce';
import { InputDataType, isInputDataType, PasswordDataType } from './types';
import { anyArrayBuffer2Buffer, printObject } from './utils';
import { PromisifyTransform } from './utils/stream';

export interface EncryptOptions {
    algorithm?: CryptAlgorithmName;
    keyDerivation?: KeyDerivationOptions;
    compress?: CompressOptionsWithString;
}

export async function encryptFirstChunk(
    cleartext: InputDataType,
    password: PasswordDataType,
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
    const { deriveKey, saltLength } = getKDF(options.keyDerivation);
    const salt = randomBytes(saltLength);
    const keyLength = algorithm.keyLength;
    const { key, normalizedOptions: normalizedKeyDerivationOptions } = await deriveKey(
        password,
        salt,
        keyLength,
    );

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

export async function encryptSubsequentChunk(
    cleartext: InputDataType,
    options: {
        algorithm: CryptAlgorithm;
        key: Uint8Array;
        compress: CompressOptionsWithString | undefined;
    },
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

export class EncryptorTransform extends PromisifyTransform {
    private readonly password: PasswordDataType;
    private readonly options: EncryptOptions;
    private encryptData: { algorithm: CryptAlgorithm; key: Uint8Array } | undefined;

    constructor(password: PasswordDataType, options: EncryptOptions) {
        super({ writableObjectMode: true });
        this.password = password;
        this.options = options;
    }

    async transform(chunk: unknown): Promise<Buffer> {
        if (!isInputDataType(chunk)) {
            throw new TypeError(
                `Invalid type chunk received.`
                    + ` Each chunk must be of type string or an instance of Buffer, TypedArray, DataView, or ArrayBuffer.`
                    + ` Received ${printObject(chunk)}`,
            );
        }

        const encryptData = this.encryptData;
        if (encryptData) {
            const { encryptedData } = await encryptSubsequentChunk(
                chunk,
                { algorithm: encryptData.algorithm, key: encryptData.key, compress: this.options.compress },
            );
            return encryptedData;
        } else {
            const { algorithm, key, encryptedData } = await encryptFirstChunk(chunk, this.password, this.options);
            this.encryptData = { algorithm, key };
            return encryptedData;
        }
    }
}
