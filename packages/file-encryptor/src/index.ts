import { cryptAlgorithmMap, CryptAlgorithmName } from './cipher';
import { CompressOptionsWithString, decompress } from './compress';
import { encryptFirstChunk, EncryptOptions } from './encrypt';
import { parseHeader } from './header';
import { deriveKey, KeyDerivationOptions } from './key-derivation-function';
import { nonceState } from './nonce';
import { DecryptorTransform, EncryptorTransform } from './stream';

export { CompressOptionsWithString, CryptAlgorithmName, EncryptOptions, KeyDerivationOptions };

export async function encrypt(
    cleartext: string | Buffer,
    password: string | Buffer,
    options: EncryptOptions = {},
): Promise<Buffer> {
    return (await encryptFirstChunk(cleartext, password, options)).encryptedData;
}

export async function decrypt(encryptedData: Buffer, password: string | Buffer): Promise<Buffer> {
    /**
     * Verify the structure of encrypted data & read the headers contained in the encrypted data
     */
    const [data, ciphertext] = parseHeader(encryptedData);

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

    return cleartext;
}

export function encryptStream(password: string | Buffer, options: EncryptOptions = {}): EncryptorTransform {
    return new EncryptorTransform(password, options);
}

export function decryptStream(password: string | Buffer): DecryptorTransform {
    return new DecryptorTransform(password);
}
