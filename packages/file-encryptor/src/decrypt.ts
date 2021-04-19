import { CryptAlgorithm, cryptAlgorithmMap } from './cipher';
import { CompressAlgorithmName, decompress } from './compress';
import { parseHeader, parseSimpleHeader } from './header';
import { deriveKey } from './key-derivation-function';
import { nonceState } from './nonce';

export interface DecryptedData {
    cleartext: Buffer;
    readByteLength: number;
}

export interface DecryptedFirstData extends DecryptedData {
    algorithm: CryptAlgorithm;
    key: Uint8Array;
    compressAlgorithmName: CompressAlgorithmName | undefined;
}

export async function decryptFirstChunk(
    encryptedData: Buffer,
    password: string | Buffer,
): Promise<DecryptedFirstData> {
    /**
     * Verify the structure of encrypted data & read the headers contained in the encrypted data
     */
    const { header: data, ciphertext, readByteLength } = parseHeader(encryptedData);

    const algorithm = cryptAlgorithmMap.get(data.algorithmName);
    if (!algorithm) {
        throw new TypeError(`Unknown algorithm was received: ${data.algorithmName}`);
    }

    /**
     * Update the invocation part in the nonce
     */
    nonceState.updateInvocation(data.nonce);

    /**
     * Generate key
     */
    const { key } = await deriveKey(password, data.salt, data.keyLength, data.keyDerivationOptions);

    /**
     * Decrypt ciphertext
     */
    const decipher = algorithm.createDecipher(key, data.nonce);
    decipher.setAuthTag(data.authTag);
    const compressedCleartext = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
    ]);

    /**
     * Decompress cleartext
     */
    const cleartext = data.compressAlgorithmName
        ? await decompress(compressedCleartext, data.compressAlgorithmName)
        : compressedCleartext;

    return {
        cleartext,
        algorithm,
        key,
        compressAlgorithmName: data.compressAlgorithmName,
        readByteLength,
    };
}

export async function decryptSubsequentChunk(
    encryptedData: Buffer,
    options: {
        algorithm: CryptAlgorithm;
        key: Uint8Array;
        compressAlgorithmName: CompressAlgorithmName | undefined;
    },
): Promise<DecryptedData> {
    /**
     * Verify the structure of encrypted data & read the headers contained in the encrypted data
     */
    const { header: data, ciphertext, readByteLength } = parseSimpleHeader(encryptedData);

    /**
     * Update the invocation part in the nonce
     */
    nonceState.updateInvocation(data.nonce);

    /**
     * Decrypt ciphertext
     */
    const decipher = options.algorithm.createDecipher(options.key, data.nonce);
    decipher.setAuthTag(data.authTag);
    const compressedCleartext = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
    ]);

    /**
     * Decompress cleartext
     */
    const cleartext = options.compressAlgorithmName
        ? await decompress(compressedCleartext, options.compressAlgorithmName)
        : compressedCleartext;

    return { cleartext, readByteLength };
}
